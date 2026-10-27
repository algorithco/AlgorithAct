#!/usr/bin/env bash
set -eo pipefail

# Sources are fetched and SHA-256 verified by build-ffmpeg.mjs before this runs.
build=$(cd "$1" && pwd)
mkdir -p "$2"
prefix=$(cd "$2" && pwd)
platform=$(uname -s)
jobs=4
extra_libs=-lstdc++
extra_ldflags="-L$prefix/lib"
vpx_target=()
openh264_options=()
ffmpeg_options=()
cmake_options=()

case "$platform" in
  Darwin)
    export MACOSX_DEPLOYMENT_TARGET=12.0
    export CFLAGS="-mmacosx-version-min=12.0"
    export CXXFLAGS="$CFLAGS"
    export LDFLAGS="$CFLAGS"
    extra_libs=-lc++
    extra_ldflags="$extra_ldflags -mmacosx-version-min=12.0"
    cmake_options+=(-DCMAKE_OSX_DEPLOYMENT_TARGET=12.0)
    ;;
  MINGW*|MSYS*)
    # Native Windows paths also work in .pc files consumed by MinGW pkg-config.
    prefix=$(cygpath -m "$prefix")
    extra_ldflags="-L$prefix/lib -static"
    openh264_options+=(OS=mingw_nt ARCH=x86_64)
    vpx_target+=(--target=x86_64-win64-gcc)
    ffmpeg_options+=(--target-os=mingw32 --arch=x86_64 --cc=gcc --cxx=g++)
    cmake_options+=(-G 'MSYS Makefiles')
    ;;
esac

export PKG_CONFIG_PATH="$prefix/lib/pkgconfig"
export PATH="$prefix/bin:$PATH"

cd "$build/openh264"
make -j"$jobs" libraries BUILDTYPE=Release "${openh264_options[@]}"
make install-static PREFIX="$prefix" "${openh264_options[@]}"

cd "$build/libvpx"
./configure --prefix="$prefix" --disable-examples --disable-tools --disable-docs --disable-unit-tests --disable-shared --enable-static --enable-pic --disable-vp8 "${vpx_target[@]}"
make -j"$jobs"
make install

cmake -S "$build/opus" -B "$build/opus-build" -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX="$prefix" -DCMAKE_INSTALL_LIBDIR=lib -DCMAKE_POSITION_INDEPENDENT_CODE=ON -DOPUS_PACKAGE_VERSION=1.5.2 -DOPUS_BUILD_SHARED_LIBRARY=OFF -DOPUS_BUILD_TESTING=OFF -DOPUS_BUILD_PROGRAMS=OFF "${cmake_options[@]}"
cmake --build "$build/opus-build" --parallel "$jobs"
cmake --install "$build/opus-build"

cd "$build/ffmpeg"
./configure --prefix="$prefix" --disable-doc --disable-debug --disable-ffplay --disable-network --disable-autodetect --disable-shared --enable-static --disable-everything \
  --enable-ffmpeg --enable-ffprobe --enable-avcodec --enable-avformat --enable-avfilter --enable-swscale --enable-swresample \
  --enable-libopenh264 --enable-libvpx --enable-libopus --pkg-config-flags=--static \
  --extra-cflags="-I$prefix/include" --extra-ldflags="$extra_ldflags" --extra-libs="$extra_libs" \
  --enable-protocol=file,pipe --enable-demuxer=rawvideo,wav,mov,matroska,mp3,ogg,aac,flac \
  --enable-muxer=mp4,webm,wav,pcm_f32le --enable-encoder=libopenh264,libvpx_vp9,aac,libopus,pcm_s16le,pcm_f32le \
  --enable-decoder=rawvideo,h264,vp9,pcm_s16le,pcm_s24le,pcm_f32le,aac,opus,mp3,flac,vorbis \
  --enable-parser=aac,h264,opus,mpegaudio,vp9 --enable-bsf=h264_mp4toannexb,extract_extradata,aac_adtstoasc \
  --enable-filter=scale,format,aresample,anull,pan,aformat \
  "${ffmpeg_options[@]}"
make -j"$jobs"
make install
