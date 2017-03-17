# Project Late Christmas

> Static site snap shot generator.

## To Run:

### Scraper:

`kinit` yourself into web1.preprod (eZ)

```bash
rm -rf public/*
/usr/local/bin/rsync -aLv --no-owner --no-perms --no-group --no-times ubuntu@web1.preprod.content.us-east-1.hootops.com:/var/www/web/cms/ ./public/cms
/usr/local/bin/rsync -aLv --no-owner --no-perms --no-group --no-times ubuntu@web1.preprod.content.us-east-1.hootops.com:/var/www/web/bundles/ ./public/bundles
node --max-old-space-size=4096 dist/index.js scrape
```

### Host Warmer:

This is a handy way to warm up our eZ caches (1 and 2). It will ping a the URLs through both caches 1 and 2, but not save the content locally.

```bash
node --max-old-space-size=4096 dist/index.js warmhosts
```


### Syncing eZ Assets

```bash
#!/usr/bin/env bash

EZP_HOST="web1.preprod.content.us-east-1.hootops.com"
CRAFT_HOST="web.staging.craftcms.us-east-1.hootops.com"
CRAFT_EZP_DIR="/efs1/ezp"

BUNDLES="bundles"
CMS="cms"
VAR="var/hootsuite/storage"

mkdir -p ${BUNDLES}
mkdir -p ${CMS}
mkdir -p ${VAR}

# Pull down static assets
rsync -aLv ubuntu@${EZP_HOST}:/var/www/web/${BUNDLES}/ ${BUNDLES}
rsync -aLv ubuntu@${EZP_HOST}:/var/www/web/${CMS}/ ${CMS}
rsync -aLv ubuntu@${EZP_HOST}:/var/www/web/${VAR}/ ${VAR}

# Push to target craft host
rsync -aLv --no-owner --no-perms --no-group --no-times ./* ubuntu@${CRAFT_HOST}:${CRAFT_EZP_DIR}/
```


### Pushing Assets

```bash
rsync -aLv --no-perms --no-times content bundles cms ubuntu@web.staging.craftcms.us-east-1.hootops.com:/efs1/ezp/
```

```bash
rsync -aLv --no-perms --no-times content bundles cms ubuntu@web-0697ba6444e7207aa.craftcms.us-east-1.hootops.com:/efs1/ezp/
```
