How to run

clone repo ```git clone https://github.com/agentsmity/micro-f-test.git ~/test```
run docker ```cd ~/test && docker-compose up -d```
wait until pulling images and starting system

parse page ```docker exec -it microf1_php_1 php console app:parse```
optionaly you can add params ```--page=2```

check results ```docker exec -it microf1_mysql_1 mysql -u user -ptest -D test```
run queries 
```set names utf8mb4;```
```seelct * from news```