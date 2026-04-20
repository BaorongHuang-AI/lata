import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    icon: './assets/icons/icon', // no extension here
  },
  rebuildConfig: {},
  makers: [new MakerSquirrel({
      name: 'LATA',
      iconUrl: 'https://example.com/icon.ico', // Squirrel installer icon
      setupIcon: './assets/icons/icon.ico',    // Windows installer icon
  }), new MakerZIP({}, ['darwin']), new MakerRpm({}), new MakerDeb({
  })],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      devContentSecurityPolicy: "connect-src 'self' * 'unsafe-eval'",
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'BaorongHuang-AI',
          name: 'LATA',
        },
        draft: false,
        prerelease: false,
      },
    },
  ],
};
export default config;
