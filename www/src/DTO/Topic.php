<?php

declare(strict_types=1);

namespace App\DTO;

class Topic
{
    private $link;
    private $title;
    private $body;
    private $poster;

    public function __construct(string $link, string $title, string $body, string $poster)
    {
        $this->link = $link;
        $this->title = $title;
        $this->body = $body;
        $this->poster = $poster;
    }

    public function __get($name): ?string
    {
        $name = lcfirst($name);

        if (!property_exists($this, $name)) {
            return null;
        }

        return $this->$name;
    }
}
