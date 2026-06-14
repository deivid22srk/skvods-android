# SKVods Proxy - Android App

Aplicativo Android do SKVods Proxy para assistir vídeos, lives e séries dos seus streamers favoritos.

## Funcionalidades

- Assistir vídeos VOD dos streamers
- Lives ao vivo com player HLS nativo
- Busca e filtros avançados
- Favoritos e histórico local
- Suporte a múltiplas qualidades (360p, 720p, Source)
- Modo escuro
- Interface otimizada para mobile

## Tecnologias

- Capacitor 6
- Android SDK 34
- Gradle 8.2
- Java 17

## Build

O APK é compilado automaticamente via GitHub Actions. Para build local:

```bash
# Instalar dependências
npm install

# Sync Capacitor
npx cap sync

# Build Android
npx cap open android
# ou
./android/gradlew assembleDebug
```

## CI/CD

O workflow `build.yml` compila o APK automaticamente em cada push para a branch `main`.

## Licença

Projeto privado.# Trigger build
