<?php

declare(strict_types=1);

namespace App\Command;

use go\DB\DB;
use App\Config\Constant;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class MigrationCommand extends Command
{
    protected static $defaultName = 'app:migration';

    protected function configure(): void
    {
        $this->setDescription('Create tables');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $db = DB::create(Constant::MYSQL_PARAMS, 'mysql');
        $db->query('DROP TABLE IF EXISTS news');
        $db->query("
            CREATE TABLE news (
                `id` tinyint(1) NOT NULL AUTO_INCREMENT,
                `link` text,
                `title` text,
                `poster` text,
                `body` text,
                `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        ");

        return 0;
    }
}
