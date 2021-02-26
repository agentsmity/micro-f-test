<?php

declare(strict_types=1);

namespace App\Components;

use simplehtmldom\HtmlWeb;
use App\DTO\Topic;

class Parser
{
    private const URL_PATTERN = 'https://itc.ua/news/%s';
    private const PAGE_PATTERN = 'page/%s/';

    private $db;
    private $doc;

    public function __construct()
    {
        $this->doc = new HtmlWeb();
    }

    public function getTopics(int $page = null): array
    {
        $list = [];

        if (!is_null($page)) {
            $page = sprintf(self::PAGE_PATTERN, $page);
        }

        $url = sprintf(self::URL_PATTERN, $page ?? '');

        $page = $this->doc->load($url);

        foreach ($page->find('#content .post.block-in-loop') as $topic) {
            $a = $topic->find("h2 a")[0] ?? null;

            if (!is_null($a)) {
                $list[] = $a->href;
            }
        }

        return $list;
    }

    public function parseTopic(string $url): Topic
    {
        $page = $this->doc->load($url);

        return new Topic(
            $url,
            $page->find(".h1.text-uppercase.entry-title")[0]->innertext ?? '',
            $page->find(".post-txt")[0]->plaintext ?? '',
            $page->find(".post-txt .itc-post-thumb")[0]->src ?? '',
        );
    }
}