FROM php:7.4-fpm

RUN apt-get update && apt-get install -y \
        wget \
        git \
        libmcrypt-dev \
        libpng-dev \
        libzip-dev \
        libonig-dev \
        libcurl4-openssl-dev \
    && docker-php-ext-install -j$(nproc)  mbstring pdo_mysql mysqli curl \
    && pecl install mcrypt-1.0.3 \
    && docker-php-ext-enable mcrypt
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
ADD php.ini /usr/local/etc/php/conf.d/40-custom.ini
COPY entrypoint.sh /usr/local/bin
WORKDIR /var/www
CMD ["php-fpm"]
ENTRYPOINT ["entrypoint.sh"]