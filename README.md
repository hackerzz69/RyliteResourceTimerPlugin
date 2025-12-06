# Ryelite resource timer plugin

Currently only supports ores, mostly based on wiki values (which appear inaccurate, so shall need testing).

## Development

### Prerequisites

- Node.js (v22 or higher recommended)
- Yarn package manager (v4.9.1 or compatible)

### Installation

1. **Use this template**: Click the "Use this template" button on GitHub to create a new repository based on this template
2. **Clone your new repository**: 
   ```bash
   git clone https://github.com/GrandyB/RyliteResourceTimerPlugin.git
   cd RyliteResourceTimerPlugin
   ```
3. **Install dependencies**:

```bash
yarn install
```
### Development

To build the plugin in development mode with file watching:

```bash
yarn dev
```

To build the plugin for production:

```bash
yarn build
```

The built plugin will be available in the `dist/` directory as `ResourceTimerPlugin.js`.