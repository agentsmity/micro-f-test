#!/bin/bash
set -e
composer install
php console app:migration
exec "$@"