# Approved avocado artwork

`avocado-original.png` is the user-approved generated illustration: a centred avocado half with a simple texture on a white background. Preserve its composition.

The native 1024 × 1024 opaque icon and web icons are resized exports of this original, without cropping or redrawing. iOS applies its own icon mask.

To regenerate the native icon on macOS:

```sh
sips -z 1024 1024 assets/branding/avocado-original.png --out mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/avocado.png
```
