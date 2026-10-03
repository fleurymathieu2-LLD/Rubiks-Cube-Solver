# Rubik's Cube Solver

An iPad app that helps you solve a 3 × 3 Rubik's cube, and teaches you how to do it yourself.

1. **Enter your cube.** Hold the cube the way the app shows and tap in the 9 colors of each side. The app checks the colors and tells you exactly what to fix if something is wrong.
2. **Follow the steps.** The app solves the cube with the beginner's layer-by-layer method in 7 stages. Each step tells you how to hold the cube. You tap **Next move** and the 3D cube shows the turn, with a picture and plain words ("Turn the right side up, away from you"). It works step by step: each move has its own screen, and nothing changes until you tap. Go back and forth with **Previous move** and **Next move**, tap any move in the list to jump to it, or tap **Show this move again**.
3. **Learn why.** Turn on **Explain** to see why each step works. The **Learn the method** page has a short guide and a demo for every stage, so you can learn to solve the cube without the app.

The app is a web app. It runs in Safari on the iPad, and you can add it to the home screen so it opens full screen like a normal app. It works offline after the first visit.

## Use it on your iPad

The simplest way is to run it from your Mac and open it on the iPad over Wi-Fi:

1. Install [Node.js](https://nodejs.org) (version 20 or newer) on the Mac.
2. In Terminal:
   ```bash
   cd ~/"Rubiks Cube Solver"   # or wherever you cloned the repo
   npm install
   npm run build
   npm run preview
   ```
3. Terminal shows a "Network" address, for example `http://192.168.1.20:4173`. Open that address in Safari on the iPad. The iPad must be on the same Wi-Fi.
4. In Safari, tap **Share**, then **Add to Home Screen**.

To have it always available (also away from home), host the `dist/` folder on any static web host, for example Netlify, Cloudflare Pages or GitHub Pages. The build is one self-contained `index.html` plus an icon, a manifest and an offline helper.

## For developers

```bash
npm install
npm run dev        # dev server with hot reload (also on your network)
npm test           # solver, input checks and guide claims
npm run typecheck
npm run build      # production build in dist/
```

### How it is built

- **React + TypeScript + Vite**, no other runtime libraries. The 3D cube is plain CSS 3D transforms.
- `src/cube/cube.ts`: the cube model. 54 stickers. Every move table comes from 3D geometry, not from hand-typed lists.
- `src/cube/solver.ts`: the beginner's method solver. It works like a person: white on the bottom, yellow on top, and only left/right turns of the whole cube between steps. Each step has the hold, the moves (in labeled parts), a short instruction and a "why" text.
- `src/cube/validate.ts`: checks an entered cube (color counts, centers, real pieces, twisted corners, flipped edges, swapped pieces) and names the stickers to check.
- `src/content/learn.ts`: the move descriptions and the guide for the 7 stages.
- `src/ui/`: the screens and the 3D cube.

### Tests

The tests solve 3000 random cubes and replay every step. They also check each claim the guide makes about an algorithm (for example "R U R' U' takes 1, 3 or 5 rounds to insert a corner") on the cube model.
