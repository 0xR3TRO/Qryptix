# Qryptix Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Module Reference](#module-reference)
3. [QR Code Generation](#qr-code-generation)
4. [Password Vault](#password-vault)
5. [TOTP Authenticator](#totp-authenticator)
6. [Password Generator](#password-generator)
7. [Security Model](#security-model)
8. [Data Storage](#data-storage)
9. [Browser Compatibility](#browser-compatibility)
10. [API Reference (Internal Modules)](#api-reference)

---

## Architecture Overview

Qryptix is a single-page application (SPA) built with pure HTML, CSS, and JavaScript. It uses no external frameworks or libraries. All code runs entirely client-side.

### File Structure

```
Qryptix/
├── index.html              # Main application
├── assets/
│   ├── styles.css          # Application styles
│   ├── script.js           # All JS modules
│   └── icons/              # Icon assets
├── landing/
│   └── index.html          # Landing/presentation page
├── docs/
│   └── documentation.md    # This file
└── README.md               # Project README
```

### Module Architecture (script.js)

The application is organized into self-contained IIFE modules:

| Module         | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `QR`           | Pure JavaScript QR code generation (ISO 18004) |
| `QRRenderer`   | Canvas and SVG rendering                       |
| `Toast`        | Notification toasts                            |
| `Settings`     | User preferences (localStorage)                |
| `DataDetector` | Auto-detect input type (URL, email, phone)     |
| `History`      | QR code history (localStorage)                 |
| `CryptoUtils`  | AES-256-GCM encryption via Web Crypto API      |
| `Vault`        | Password vault with encrypted storage          |
| `TOTP`         | Time-based One-Time Password (RFC 6238)        |
| `PasswordGen`  | Cryptographically secure password generation   |
| `UI`           | All DOM manipulation, event handling           |

---

## QR Code Generation

### Supported Data Types

- **Auto Detect** — Automatically identifies URLs, emails, phone numbers
- **Text** — Plain text
- **URL** — Web addresses
- **Email** — mailto: links with subject and body
- **Phone** — tel: links
- **Wi-Fi** — WIFI: format with SSID, password, encryption type
- **vCard** — Contact cards (v3.0)
- **Event** — Calendar events (VEVENT format)

### Customization Options

- **Error Correction Level**: L (7%), M (15%), Q (25%), H (30%)
- **Size**: 128px to 1024px
- **Foreground Color**: Any hex color
- **Background Color**: Any hex color
- **Center Logo**: Upload any image

### Export Formats

- **PNG** — Raster image via canvas.toDataURL()
- **SVG** — Vector image generated programmatically
- **Clipboard** — Copy as PNG image to clipboard

### Batch Generation

Enter multiple items (one per line) to generate QR codes simultaneously.

---

## Password Vault

### Encryption

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with SHA-256, 600,000 iterations
- **Salt**: 16 bytes random per encryption
- **IV**: 12 bytes random per encryption

### Master Password

- Minimum 8 characters required
- Stored as SHA-256 hash (with salt prefix) for verification
- Never stored in plaintext

### Entry Fields

- Title, Username, Password, URL, Category, Color Label, Notes

### Auto-Lock

- Configurable timeout (default: 5 minutes)
- Automatically locks vault after inactivity

---

## TOTP Authenticator

### RFC 6238 Implementation

- **Algorithms**: SHA-1, SHA-256, SHA-512
- **Digits**: 6 or 8
- **Period**: Configurable (default: 30 seconds)
- **Key Format**: Base32 encoded

### Features

- Real-time countdown timer
- Click-to-copy codes
- Visual timer indicator (SVG circle)

---

## Password Generator

### Generation Modes

1. **Random** — Cryptographically random characters
2. **Memorable** — Word-based passphrases
3. **PIN** — Numeric only

### Options

- Length: 4–128 characters
- Character sets: Uppercase, Lowercase, Digits, Symbols
- Exclude ambiguous characters (0, O, l, 1, I)
- Custom character set
- Word count, separator, capitalization (for memorable)

### Strength Meter

Evaluates: length, character diversity, unique characters.
Levels: Very Weak, Weak, Moderate, Strong, Very Strong.

---

## Security Model

### Principles

1. **Zero Trust** — No data leaves the browser
2. **Defense in Depth** — Multiple encryption layers
3. **Minimal Surface** — No external dependencies, no CDN, no API calls

### Cryptographic Primitives

- **AES-256-GCM** (Web Crypto API) — Vault encryption
- **PBKDF2-SHA256** — Key derivation (600K iterations)
- **HMAC-SHA1/256/512** — TOTP generation
- **crypto.getRandomValues()** — Password generation

### LocalStorage Security

All sensitive data (vault entries) is encrypted before storage. Only the master password hash is stored for verification. TOTP secrets are stored in plaintext in localStorage (this is a known limitation — the vault provides the encrypted alternative for highest security).

---

## Data Storage

All data is stored in `localStorage` under these keys:

| Key                  | Content                           |
| -------------------- | --------------------------------- |
| `qryptix_settings`   | User preferences (JSON)           |
| `qryptix_history`    | QR code generation history (JSON) |
| `qryptix_vault`      | Encrypted vault entries (Base64)  |
| `qryptix_vault_hash` | Master password hash (Base64)     |
| `qryptix_totp`       | TOTP account configs (JSON)       |

### Backup & Restore

- Export: Downloads all data as JSON (vault remains encrypted)
- Import: Restores from JSON backup file

---

## Browser Compatibility

### Required APIs

- Web Crypto API (SubtleCrypto)
- Canvas API
- Clipboard API
- localStorage
- TextEncoder / TextDecoder
- CSS Custom Properties
- CSS Grid / Flexbox

### Tested Browsers

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

---

## API Reference

### QR.generate(text, ecl)

Generates a QR code matrix.

- `text` (string) — Data to encode
- `ecl` (string) — Error correction: 'L', 'M', 'Q', 'H'
- Returns: `{ modules: boolean[][], size: number, version: number }` or `null`

### QRRenderer.toCanvas(canvas, qr, options)

Renders QR code to a canvas element.

- `canvas` — Canvas DOM element
- `qr` — QR object from QR.generate()
- `options` — `{ size, fgColor, bgColor, logo }`

### QRRenderer.toSVG(qr, options)

Generates SVG string.

- Returns: SVG XML string

### CryptoUtils.encrypt(plaintext, password)

Encrypts text with AES-256-GCM.

- Returns: Promise<string> (Base64)

### CryptoUtils.decrypt(ciphertext, password)

Decrypts Base64 ciphertext.

- Returns: Promise<string>

### PasswordGen.generate(options)

Generates a password.

- `options` — `{ length, uppercase, lowercase, digits, symbols, type, ... }`
- Returns: string

### TOTP.generateCode(account)

Generates current TOTP code.

- `account` — `{ secret, algorithm, digits, period }`
- Returns: Promise<{ code, remaining, period }>
