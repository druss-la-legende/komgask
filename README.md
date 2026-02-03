# Komgask

Tampermonkey userscript for quick Komga series search with keyboard shortcut.

## Features

- **Global shortcut** (Ctrl+Y) works on any website
- Search series by name
- View books in descending order
- Keyboard navigation
- Dark theme UI

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Click on the script file: [komgask.js](komgask.js)
3. Click "Raw" then "Install"

## Configuration

Edit the script and set your Komga server details:

```javascript
const KOMGA_URL = 'http://localhost:25600';  // Your Komga URL
const KOMGA_API_KEY = '';                     // Settings > Users > API Key
```

## Usage

| Key | Action |
|-----|--------|
| `Ctrl+Y` | Open/close search |
| `↑` `↓` | Navigate list |
| `Enter` | Select series |
| `Esc` | Back / Close |
| `Backspace` | Back to search |
