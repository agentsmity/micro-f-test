<?php

use yii\db\Migration;

/**
 * Class m210224_121636_createUser
 */
class m210224_121636_createUser extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('user', array(
            'id' => 'pk',
            'login' => 'string NOT NULL',
            'password' => 'text',
        ));
        $this->createTable('token', array(
            'id' => 'pk',
            'userId' => 'int NOT NULL',
            'token' => 'text',
        ));
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        echo "m210224_121636_createUser cannot be reverted.\n";

        return false;
    }

    /*
    // Use up()/down() to run migration code without a transaction.
    public function up()
    {

    }

    public function down()
    {
        echo "m210224_121636_createUser cannot be reverted.\n";

        return false;
    }
    */
}
