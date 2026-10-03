# Rubik's Cube Solver

An iPad app that helps you solve a 3 × 3 Rubik's cube, and teaches you how to do it yourself.

1. **Enter your cube.** Hold the cube the way the app shows and tap in the 9 colors of each side. The app checks the colors and tells you exactly what to fix if something is wrong.
2. **Follow the steps.** The app solves the cube with the beginner's layer-by-layer method in 7 stages. Each step tells you how to hold the cube. You tap **Next move** and the 3D cube shows the turn, with a picture and plain words ("Turn the right side up, away from you"). It works step by step: each move has its own screen, and nothing changes until you tap. Go back and forth with **Previous move** and **Next move**, tap any move in the list to jump to it, or tap **Show this move again**.
3. **Learn why.** Turn on **Explain** to see why each step works. The **Learn the method** page has a short guide and a demo for every stage, so you can learn to solve the cube without the app.

The app is a web app. It runs in Safari on the iPad, and you can add it to the home screen so it opens full screen like a normal app.

## Use it on your iPad

### Recommended: host it on Netlify (free, no Mac needed)

The repo has a `netlify.toml` file, so Netlify knows how to build the app.

1. Go to https://app.netlify.com and sign up with your GitHub account.
2. Choose **Add new site → Import an existing project → GitHub**, and pick `Rubiks-Cube-Solver`. Give Netlify access to this repo when GitHub asks.
3. Keep the settings it shows (they come from `netlify.toml`) and click **Deploy**.
4. After a minute or two you get an address like `https://something.netlify.app`. Open it in Safari on the iPad, then tap **Share → Add to Home Screen**.

Every push to `main` updates the site automatically. Because the address uses **https**, the app keeps a copy on the iPad and opens without internet after the first visit.

### From your Mac, over Wi-Fi

1. Install [Node.js](https://nodejs.org) (version 22 or newer) on the Mac.
2. In Terminal:
   ```bash
   cd ~/"Rubiks Cube Solver"   # or wherever you cloned the repo
   npm install
   npm run build
   npm run preview
   ```
3. Open the `Network:` address that Terminal shows (for example `http://10.0.0.44:4173`) in Safari on the iPad. The iPad must be on the same Wi-Fi, and the Terminal window must stay open. The address can change when the Mac reconnects to Wi-Fi.

This way the app does **not** work offline: Safari only keeps an offline copy for https addresses.

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
