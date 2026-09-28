#!/usr/bin/env bash
# Updates Rohat on the server to the latest code on GitHub (main). Run as root:
#   bash /home/romin/rohat/deploy/update.sh
set -euo pipefail
sudo -u romin -H git -C /home/romin/rohat pull --ff-only
exec bash /home/romin/rohat/deploy/setup.sh
