<?php

declare(strict_types=1);

namespace App\Command;

use DateTime;
use DateInterval;
use App\Components\Parser;
use App\Components\Storage;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Output\ConsoleOutput;
use Symfony\Component\Console\Helper\ProgressBar;
use Symfony\Component\Console\Helper\Table;
use Symfony\Component\Console\Helper\TableCell;

class ParseCommand extends Command
{
    protected static $defaultName = 'app:parse';

    protected function configure(): void
    {
        $this->setDescription('Parsing news from itc.ua')
            ->addOption(
                'page',
                null,
                InputOption::VALUE_OPTIONAL,
                'News page'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $start = microtime(true);

        try {
            $this->process((int) $input->getOption('page'));
        } catch (\Throwable $e) {
            $output->writeln(sprintf("Error: %s", $e->getMessage()));
        }

        $output->writeln(sprintf("\nCompleted in %01.2f seconds", microtime(true) - $start));

        return 0;
    }

    private function process(int $page = null): void
    {
        $parser = new Parser();
        $storage = new Storage();

        $topics = array_filter($parser->getTopics($page));

        $section = (new ConsoleOutput())->section();
        $progress = new ProgressBar($section, count($topics));

        ProgressBar::setFormatDefinition('process', "%message%\t%current%/%max%\t[%bar%]\t%memory:6s%");

        $progress->setFormat('process');
        $progress->setMessage('Processing...');
        $progress->start();

        foreach ($topics as $link) {
            $storage->save($parser->parseTopic($link));

            $progress->advance();
        }

        $progress->finish();
        $section->clear();
    }
}
