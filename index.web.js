import "@expo/metro-runtime"
import { registerRootComponent } from 'expo'
import * as Font from 'expo-font'
import Icon from 'react-native-vector-icons/FontAwesome'

import App from './App'
import { initService } from '~/utils/player'

// Preload FontAwesome icon font on web entry point
if (Icon && typeof Icon.loadFont === 'function') {
	Icon.loadFont().catch(() => {})
} else if (Icon && Icon.font) {
	Font.loadAsync(Icon.font).catch(() => {})
}

registerRootComponent(App)

initService()