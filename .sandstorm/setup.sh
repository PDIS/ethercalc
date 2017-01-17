#!/bin/bash

# When you change this file, you must take manual action. Read this doc:
# - https://docs.sandstorm.io/en/latest/vagrant-spk/customizing/#setupsh

set -euo pipefail
# This is the ideal place to do things like:
#
#    export DEBIAN_FRONTEND=noninteractive
#    apt-get update
#    apt-get install -y nginx nodejs nodejs-legacy python2.7 mysql-server
#
# If the packages you're installing here need some configuration adjustments,
# this is also a good place to do that:
#
#    sed --in-place='' \
#            --expression 's/^user www-data/#user www-data/' \
#            --expression 's#^pid /run/nginx.pid#pid /var/run/nginx.pid#' \
#            --expression 's/^\s*error_log.*/error_log stderr;/' \
#            --expression 's/^\s*access_log.*/access_log off;/' \
#            /etc/nginx/nginx.conf

# By default, this script does nothing.  You'll have to modify it as
# appropriate for your application.

apt update
apt install -y nodejs
ln -s `which nodejs` /usr/bin/node
apt install -y npm
cd /opt/app
npm i

# apt install -y tcl
# wget http://download.redis.io/redis-stable.tar.gz
# tar xvzf redis-stable.tar.gz
# cd redis-stable
# make

cp /opt/app/dump.json /var/dump.json
export PORT=33411

exit 0
