import type { ConfigContext, ExpoConfig } from 'expo/config';

import identity from './src/config/identity.json';

// Le nom affiché provient de la source unique src/config/identity.json (spec app-shell) ;
// le reste de la configuration vit dans app.json.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: identity.name,
  slug: config.slug ?? 'lisnard-play',
});
