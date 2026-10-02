#!/bin/zsh
# Make the self-signed certificate used to sign Cosawerks .zxp files (once). Publisher: Rob Travis, TN.
# The certificate password is generated and kept in certs/.password (mode 600). Keep certs/ private and backed up:
# a new certificate means installers show a different publisher.   Not committed (see .gitignore).
set -e
cd "$(dirname "$0")/.."
source tools/_sign.sh
mkdir -p certs; chmod 700 certs
OUT="certs/cosawerks.p12"
[ -f "$OUT" ] && { echo "$OUT already exists: not replacing it"; exit 1; }
COUNTRY="${CW_CERT_COUNTRY:-US}"; STATE="${CW_CERT_STATE:-TN}"; ORG="${CW_CERT_ORG:-Rob Travis}"; CN="${CW_CERT_CN:-Rob Travis}"
if [ ! -f certs/.password ]; then
  LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 28 > certs/.password
  chmod 600 certs/.password
fi
PASS="$(cat certs/.password)"
sign_cmd -selfSignedCert "$COUNTRY" "$STATE" "$ORG" "$CN" "$PASS" "$OUT" -validityDays 3650
chmod 600 "$OUT"
echo "made $OUT for $CN ($STATE, $COUNTRY), valid ten years. Password is in certs/.password. Back up the certs folder somewhere safe."
