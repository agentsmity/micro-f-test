<?php

declare(strict_types=1);

namespace App\Components;

use App\Config\Constant;
use go\DB\DB;
use App\DTO\Topic;

class Storage
{
    private const QUERY_PATTERN = 'INSERT INTO `news` (`link`,`title`,`poster`,`body`) VALUES (?, ?, ?, ?)';

    private $db;

    public function __construct()
    {
        $this->db = DB::create(Constant::MYSQL_PARAMS, 'mysql');
    }

    public function save(Topic $data): void
    {
        $values = [$data->link, $data->title, $data->poster, $data->body];

        $this->db->query(self::QUERY_PATTERN, $values);
    }
}