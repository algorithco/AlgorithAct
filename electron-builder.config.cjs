/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.algorithact.desktop',
  productName: 'AlgorithAct',
  executableName: 'AlgorithAct',
  directories: { output: 'release/installer', buildResources: 'public/brand' },
  artifactName: 'AlgorithAct-Setup-${version}-${arch}.${ext}',
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'public/brand/algorithact.ico',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'public/brand/algorithact.ico',
    uninstallerIcon: 'public/brand/algorithact.ico',
    installerHeaderIcon: 'public/brand/algorithact.ico',
    shortcutName: 'AlgorithAct',
    uninstallDisplayName: 'AlgorithAct',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    deleteAppDataOnUninstall: false,
    runAfterFinish: true,
    packElevateHelper: false,
    differentialPackage: false,
  },
};
