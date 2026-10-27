import { Application, Container, Graphics, GraphicsPath, Matrix, RenderTexture, Sprite, Text, Texture } from 'pixi.js';
import 'pixi.js/unsafe-eval';
import type { AssetResolver, DrawNode2D, FrameState, RawFrame, Renderer } from '../contracts';
import type { Project, Shape } from '../model/schema/project';

interface Pooled { object: Container; signature: string }
const resolveColor=(value:string,palette:Record<string,string>)=>value.startsWith('$') ? (palette[value.slice(1)]??'#242A25') : value;
function drawShape(g:Graphics,s:Shape,palette:Record<string,string>):void {
  if(s.t==='path') g.path(new GraphicsPath(s.d));
  else if(s.t==='ellipse')g.ellipse(s.x,s.y,s.rx,s.ry);
  else if(s.t==='rect')g.roundRect(s.x,s.y,s.width,s.height,s.radius??0);
  else g.moveTo(s.x1,s.y1).lineTo(s.x2,s.y2);
  if('fill' in s && s.fill)g.fill(resolveColor(s.fill,palette));
  if(s.stroke)g.stroke({color:resolveColor(s.stroke.color,palette),width:s.stroke.width,cap:s.stroke.cap??'round',join:'round'});
}
export class PixiRenderer implements Renderer {
  private app=new Application();
  private world=new Container();
  private background=new Graphics();
  private backgroundSprite=new Sprite();
  private pool=new Map<string,Pooled>();
  private textures=new Map<string,{hash:string;texture:Texture}>();
  private project?:Project;
  private width=0;
  private height=0;
  private lastBackground='';
  private captureTexture?:RenderTexture;
  private captureCurrent=false;
  constructor(private captureOnly=false){}
  async init(canvas:HTMLCanvasElement,width:number,height:number):Promise<void> {
    this.width=width;this.height=height;
    await this.app.init({canvas,width,height,resolution:1,antialias:true,autoStart:false,preference:'webgl',backgroundAlpha:1});
    this.app.stage.addChild(this.background,this.backgroundSprite,this.world);
  }
  async load(project:Project,assets:AssetResolver):Promise<void> {
    this.project=project;
    this.captureCurrent=false;
    for(const [id,loaded] of this.textures) if(!project.assets[id] || project.assets[id].hash!==loaded.hash){loaded.texture.destroy(true);this.textures.delete(id);}
    for(const asset of Object.values(project.assets)) if(asset.kind==='image' && !this.textures.has(asset.id)) {
      const img=new Image();img.src=assets.url(asset.id);await img.decode();
      this.textures.set(asset.id,{hash:asset.hash,texture:Texture.from(img)});
      for(const [key,item] of this.pool)if(item.object instanceof Sprite){item.object.destroy();this.pool.delete(key);}
    }
  }
  private create(node:DrawNode2D):Container {
    const draw=node.draw;
    if(draw.type==='text')return new Text({text:draw.text,style:{fontFamily:'Arial, sans-serif',fontSize:draw.size,fontWeight:draw.size>=70?'700':'400',fill:draw.color,lineHeight:draw.size*1.12,letterSpacing:draw.size<25?2:0},resolution:2});
    if(draw.type==='image')return new Sprite(this.textures.get(draw.assetId)?.texture??Texture.EMPTY);
    const part=this.project!.library.skins[draw.skinId].parts[draw.part];
    if(part.art.kind==='image')return new Sprite(this.textures.get(part.art.assetId)?.texture??Texture.EMPTY);
    const graphics=new Graphics();for(const shape of part.art.shapes)drawShape(graphics,shape,draw.palette);return graphics;
  }
  render(frame:FrameState):void {
    const sx=this.width/frame.size.width,sy=this.height/frame.size.height;
    const bg=JSON.stringify(frame.background);
    if(bg!==this.lastBackground){
      this.background.clear().rect(0,0,this.width,this.height).fill(frame.background.type==='color'?frame.background.color:'#FFFFFF');
      this.backgroundSprite.visible=frame.background.type==='image';
      if(frame.background.type==='image'){
        const texture=this.textures.get(frame.background.assetId)?.texture;
        if(texture){this.backgroundSprite.texture=texture;const scale=frame.background.fit==='cover'?Math.max(this.width/texture.width,this.height/texture.height):Math.min(this.width/texture.width,this.height/texture.height);this.backgroundSprite.scale.set(scale);this.backgroundSprite.position.set((this.width-texture.width*scale)/2,(this.height-texture.height*scale)/2);}
      }
      this.lastBackground=bg;
    }
    const c=frame.camera;
    this.world.setFromMatrix(new Matrix(c.a*sx,c.b*sy,c.c*sx,c.d*sy,c.tx*sx,c.ty*sy));
    const active=new Set<string>();
    for(let i=0;i<frame.nodes.length;i++) {
      const node=frame.nodes[i],signature=JSON.stringify(node.draw);active.add(node.key);
      let pooled=this.pool.get(node.key);
      if(pooled?.signature!==signature){pooled?.object.destroy({children:true});pooled={object:this.create(node),signature};this.pool.set(node.key,pooled);this.world.addChild(pooled.object);}
      const m=node.world;pooled.object.setFromMatrix(new Matrix(m.a,m.b,m.c,m.d,m.tx,m.ty));pooled.object.alpha=node.opacity;
      this.world.setChildIndex(pooled.object,i);
    }
    for(const [key,item] of this.pool)if(!active.has(key)){item.object.destroy({children:true});this.pool.delete(key);}
    this.captureCurrent=false;
    if(this.captureOnly)this.renderCaptureTarget();else this.app.render();
  }
  private renderCaptureTarget():RenderTexture {
    this.captureTexture??=RenderTexture.create({width:this.width,height:this.height,resolution:1,antialias:true});
    if(!this.captureCurrent){this.app.renderer.render({container:this.app.stage,target:this.captureTexture,transform:Matrix.IDENTITY,clearColor:[0,0,0,0]});this.captureCurrent=true;}
    return this.captureTexture;
  }
  async capture():Promise<RawFrame> {
    const result=this.app.renderer.extract.pixels({target:this.renderCaptureTarget(),resolution:1});
    return {width:this.width,height:this.height,rgba:new Uint8Array(result.pixels.buffer,result.pixels.byteOffset,result.pixels.byteLength)};
  }
  async capturePng():Promise<Blob> {
    const canvas=this.app.renderer.extract.canvas({target:this.renderCaptureTarget(),resolution:1}) as HTMLCanvasElement;
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG yaratilmadi.')),'image/png'));
  }
  dispose():void {
    for(const item of this.textures.values())item.texture.destroy(true);
    this.captureTexture?.destroy(true);this.captureTexture=undefined;
    this.textures.clear();this.pool.clear();this.app.destroy(false,{children:true,texture:true});
  }
}
