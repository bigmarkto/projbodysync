# BodySync

Fitness app base project built with **Expo + React Native + TypeScript**. This repository ships only the bare scaffolding so contributors can build the full application from scratch following a clean, organized architecture.

## Tech Stack

- [Expo SDK 50](https://docs.expo.dev/)
- React Native 0.73
- React 18
- TypeScript 5
- React Navigation 6 (Native Stack + Bottom Tabs)
- AsyncStorage
- Reanimated 3 + Gesture Handler

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- [Expo Go](https://expo.dev/client) on your phone (easiest way to preview) **or** Android Studio / Xcode for emulators

### Install
```bash
npm install
```

### Run
```bash
npm start         # Expo Dev Server (scan QR with Expo Go)
npm run web       # Web preview
npm run android   # Android emulator
npm run ios       # iOS simulator (macOS only)
```

## Recommended Project Structure

The `src/` folder follows **Atomic Design** + feature layering. Contributors are encouraged to keep this organization:

```
src/
├── components/
│   ├── atoms/        # Button, Input, Text, Icon, Badge...
│   ├── molecules/    # FormField, Card, ListItem...
│   └── organisms/    # Header, BottomSheet, WorkoutCard...
├── screens/          # Screen components (one folder per screen)
├── navigation/       # RootNavigator, Stack & Tab navigators
├── context/          # ThemeContext, AuthContext, UserContext
├── services/         # API clients, calculations, storage wrappers
├── theme/            # colors, spacing, typography tokens
├── types/            # Shared TypeScript interfaces
└── utils/            # Pure helper functions
```

Path alias `@/*` is already configured in `tsconfig.json` and maps to `src/*`:

```ts
import Button from '@/components/atoms/Button';
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo development server |
| `npm run web` | Run the app in the browser |
| `npm run android` | Run on Android device/emulator |
| `npm run ios` | Run on iOS simulator |

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Follow the folder structure above
4. Keep components small and reusable (Atomic Design)
5. Open a pull request

## License

MIT
