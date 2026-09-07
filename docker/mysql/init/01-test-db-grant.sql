-- Django 테스트 러너는 실행할 때마다 `test_<DB_NAME>` 데이터베이스를 새로 만들고
-- 끝나면 지운다. MYSQL_USER 환경변수로 만들어진 계정에는 MYSQL_DATABASE 권한만
-- 붙어 있어서, 이게 없으면 `manage.py test`가 "Access denied ... to database
-- 'test_silvervision'" 로 실패한다.
GRANT ALL PRIVILEGES ON `test\_silvervision`.* TO 'silver'@'%';
FLUSH PRIVILEGES;
