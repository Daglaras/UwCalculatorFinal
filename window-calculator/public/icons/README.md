# PWA Icons

The PWA requires PNG icons in various sizes. You can generate them from the `icon.svg` file.

## Option 1: Online Tool
1. Go to https://realfavicongenerator.net/
2. Upload `icon.svg`
3. Download the generated icons
4. Place them in this folder

## Option 2: Using ImageMagick (if installed)
```bash
for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

## Option 3: Using Sharp (Node.js)
```bash
npm install sharp
node generate-icons.js
```

## Required icon sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

For now, the app will work without PNG icons but the install prompt may not show the icon properly on some devices.
