const adapters=['render-pixi2d','storage','export','audio'];
module.exports={
  forbidden:[
    {name:'no-cycles',severity:'error',from:{},to:{circular:true}},
    {name:'model-is-independent',severity:'error',from:{path:'^src/model/'},to:{pathNot:'^(src/model/|node_modules/zod/)'}},
    {name:'contracts-only-model',severity:'error',from:{path:'^src/contracts/'},to:{pathNot:'^src/(model|contracts)/'}},
    {name:'pure-engine',severity:'error',from:{path:'^src/engine/'},to:{pathNot:'^src/(model|contracts|engine)/'}},
    ...adapters.map(adapter=>({name:`isolated-${adapter}`,severity:'error',from:{path:`^src/${adapter}/`},to:{path:`^src/(?!model/|contracts/|${adapter}/)`}})),
    {name:'editor-uses-ports',severity:'error',from:{path:'^src/editor/'},to:{path:'^src/(render-|storage/|export/|audio/|app-electron/)'}},
    {name:'engine-public-api',severity:'error',from:{path:'^src/editor/'},to:{path:'^src/engine/(?!index\\.ts$)'}},
    {name:'renderer-no-node',severity:'error',from:{path:'^src/(editor|app-electron/renderer|render-pixi2d)/'},to:{dependencyTypes:['core'],path:'.'}},
  ],
  options:{doNotFollow:{path:'node_modules'},tsPreCompilationDeps:true,tsConfig:{fileName:'tsconfig.json'},enhancedResolveOptions:{extensions:['.ts','.tsx','.js','.json']}},
};
