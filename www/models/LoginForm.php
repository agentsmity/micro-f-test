<?php

namespace app\models;

use Yii;
use yii\base\Model;

/**
 * LoginForm is the model behind the login form.
 *
 * @property User|null $user This property is read-only.
 *
 */
class LoginForm extends Model
{
    private const MAX_ATTEMPT = 3;
    private const DELAY_ATTEMPT = '+5 minutes';

    public $username;
    public $password;
    public $rememberMe = true;

    private $_user = false;

    /**
     * @return array the validation rules.
     */
    public function rules()
    {
        return [
            // username and password are both required
            [['username', 'password'], 'required'],
            // rememberMe must be a boolean value
            ['rememberMe', 'boolean'],
            ['password', 'checkAttempt'],
            // password is validated by validatePassword()
            ['password', 'validatePassword'],
        ];
    }

    /**
     * Validates the password.
     * This method serves as the inline validation for password.
     *
     * @param string $attribute the attribute currently being validated
     * @param array $params the additional name-value pairs given in the rule
     */
    public function validatePassword($attribute, $params)
    {
        if (!$this->hasErrors()) {
            $session = Yii::$app->session;

            $user = $this->getUser();

            if (!$user || !$user->validatePassword($this->password)) {
                if (!$session->has('attempts')) {
                    $session->set('attempts', 0);
                }

                $session['attempts'] += 1;

                $this->addError($attribute, 'Incorrect username or password.');
            }
        }
    }

    /**
     * Logs in a user using the provided username and password.
     * @return bool whether the user is logged in successfully
     */
    public function login()
    {
        if ($this->validate()) {
            return Yii::$app->user->login($this->getUser(), $this->rememberMe ? 3600*24*30 : 0);
        }
        return false;
    }

    /**
     * Finds user by [[username]]
     *
     * @return User|null
     */
    public function getUser()
    {
        if ($this->_user === false) {
            $this->_user = User::findByUsername($this->username);
        }

        return $this->_user;
    }

    public function checkAttempt($attribute, $params)
    {
        $session = Yii::$app->session;

        if (isset($session['attempts']) && $session['attempts'] >= self::MAX_ATTEMPT) {
            if (!isset($session['attempts_delay'])) {
                $session['attempts_delay'] = strtotime(self::DELAY_ATTEMPT);
            }

            $diff = $session['attempts_delay'] - time();

            if ($diff < 0) {
                unset($session['attempts']);
                unset($session['attempts_delay']);
                return;
            }

            $mod = (int) ($diff/60);

            $this->addError(
                $attribute,
                sprintf('Attempts is over. Try in %u %s', $mod ? $mod : $diff, $mod ? 'minutes' : 'seconds')
            );
        }
    }
}
