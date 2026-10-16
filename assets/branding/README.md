# Lingonberry artwork

`lingonberry-original.png` was generated with the built-in image-generation tool for the requested Lingonberry branding. Its generation prompt is saved in `lingonberry-prompt.txt`.

The native 1024 × 1024 opaque icon and web icons are resized exports without cropping or redrawing. iOS applies its own icon mask. The app title uses a capital L: **Lingonberry**.

```sh
sips -z 1024 1024 assets/branding/lingonberry-original.png --out mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/lingonberry.png
```
