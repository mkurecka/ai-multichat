<?php
// Bezpečnostní kontrola - pouze pro vývojové účely
if (isset($_SERVER['APP_ENV']) && $_SERVER['APP_ENV'] === 'dev') {
    phpinfo();
} else {
    echo "Tento skript je dostupný pouze v vývojovém prostředí.";
}
