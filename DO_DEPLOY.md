# DigitalOcean Droplet deployment

How to run the Cube Solver on its own small DigitalOcean **Droplet**, private
to the **Tailscale** network. It works the same way as the Urbanation app
(see that repo's `DO_DEPLOY.md`), only simpler: there is no database, so there
is nothing to back up.

Run the steps from top to bottom on a new Droplet. Every block is copy-paste.

## How it works

```
 iPad / Mac (tailnet) ──tailscale──▶ Droplet "cube" (tor1)
                                      │ tailscale serve :443 → 127.0.0.1:8080
                                      └─ docker: nginx with the built app
 GitHub main ──(timer pulls every 2 min)──▶ build (runs the tests) → restart
```

- Nothing listens on the public internet. The app binds to `127.0.0.1` only,
  and `tailscale serve` publishes it to the tailnet with an https certificate.
- The address is `https://cube.<your-tailnet>.ts.net`.
- **A push to `main` deploys itself** within about 2 minutes. The Docker build
  runs all the tests first. If a test or the build fails, the old version
  keeps running.
- The iPad needs the Tailscale app to load the page. After the first visit the
  app also works offline, so Tailscale only matters for getting updates.

## 1. Create the Droplet

DigitalOcean console: **Create → Droplets**
- Region: **Toronto (TOR1)**
- Image: **Ubuntu 24.04 (LTS) x64**
- Size: **Basic → Regular → 1 GB / 1 CPU** (US$6/month). The 512 MB size is
  too small for the build.
- Authentication: your **SSH key**
- Hostname: **`cube`**
- Backups: not needed (the Droplet holds no data; GitHub has the code).

Then SSH in as root: `ssh root@<droplet-public-ip>`

## 2. Base setup: user, Docker, Tailscale

```sh
# Service user. Docker group membership lets it run the container.
adduser --disabled-password --gecos "" cube

# Docker (official repository)
apt-get update && apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker cube
systemctl enable --now docker

# Tailscale. --ssh lets you SSH in over the tailnet, so public SSH can be closed later.
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --hostname=cube --ssh
# ^ prints a link: open it and approve the machine in the Tailscale admin console.
```

Check from your Mac: `tailscale status` lists `cube` as online.

## 3. Deploy key and clone

The repo is private. Give the Droplet its own **read-only** key:

```sh
sudo -u cube mkdir -p -m 700 /home/cube/.ssh
sudo -u cube ssh-keygen -t ed25519 -N "" -f /home/cube/.ssh/id_ed25519
sudo -u cube sh -c 'ssh-keyscan github.com >> /home/cube/.ssh/known_hosts'
cat /home/cube/.ssh/id_ed25519.pub
```

On GitHub: **Rubiks-Cube-Solver → Settings → Deploy keys → Add deploy key**.
Title `cube-droplet`, paste the key, and leave **Allow write access
unchecked**. Then:

```sh
mkdir -p /opt/cube && chown cube:cube /opt/cube
sudo -u cube git clone git@github.com:fleurymathieu2-LLD/Rubiks-Cube-Solver.git /opt/cube/app
```

## 4. First start

```sh
cd /opt/cube/app
sudo -u cube docker compose -p cube_prod -f docker-compose.prod.yml up -d --build
# The first build downloads Node and nginx, installs packages and runs the
# tests: allow 2 to 4 minutes. Then:
curl -sS http://127.0.0.1:8080/health
```

Expect `ok`.

## 5. Publish it on the tailnet

```sh
tailscale serve --bg 8080
tailscale serve status
```

`tailscale serve status` shows the address, `https://cube.<your-tailnet>.ts.net`.
The setting stays after a reboot. (HTTPS certificates are already on for your
tailnet, because Urbanation uses them.)

Check from your Mac: open that address in a browser. The app must load.

## 6. Close the public side (DigitalOcean firewall)

Console: **Networking → Firewalls → Create Firewall**, apply it to the `cube`
Droplet:

- **Inbound:** nothing at all, if `ssh root@cube` works from your Mac over
  Tailscale (test it first). Otherwise keep only `SSH 22` from your own IP address.
  Optional: `UDP 41641` from anywhere, so Tailscale can connect directly
  instead of through a relay.
- **Outbound:** allow all (GitHub, Docker, Tailscale, Ubuntu updates).

## 7. Turn on automatic deploys

```sh
cd /opt/cube/app
cp deploy/do/cube-self-deploy.{service,timer} /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cube-self-deploy.timer
systemctl start cube-self-deploy.service
journalctl -u cube-self-deploy.service -n 20
```

From now on, every push to `main` goes live within about 2 minutes. If the
container ever stops, the next timer run starts it again.

## 8. Reboot test

```sh
reboot
```

After 2 to 3 minutes, open the address again from your Mac. It must load
without anyone logging in to the Droplet.

## 9. Set up the iPad

1. Install **Tailscale** from the App Store and sign in with the same account
   as your Mac.
2. In Safari, open `https://cube.<your-tailnet>.ts.net`.
3. Tap **Share → Add to Home Screen**.

After that first visit the app opens from the home screen even with Tailscale
off or no internet. With Tailscale on, it picks up new versions by itself.

## Day-to-day reference

| Task | Command (on the Droplet) |
|---|---|
| Deploy new code | nothing: push to `main` |
| Check for a new version now | `systemctl start cube-self-deploy.service` |
| Deploy log | `journalctl -u cube-self-deploy.service -n 50` |
| Is it up? | `curl -sS http://127.0.0.1:8080/health` |
| Retry after a failed build | fix it on `main`; the next push deploys. To rebuild the current commit by hand: `cd /opt/cube/app && sudo -u cube docker compose -p cube_prod -f docker-compose.prod.yml up -d --build` |
| Roll back | revert the commit on GitHub; the timer deploys the revert |

Never edit code on the Droplet: the deploy script uses `git reset --hard`.

If Docker Hub ever refuses downloads ("429 Too Many Requests"), build from
Amazon's public mirror of the same official images:

```sh
cd /opt/cube/app
sudo -u cube docker compose -p cube_prod -f docker-compose.prod.yml build \
  --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine \
  --build-arg NGINX_IMAGE=public.ecr.aws/docker/library/nginx:1.27-alpine
sudo -u cube docker compose -p cube_prod -f docker-compose.prod.yml up -d
```
