<?php
/**
 * DIAGNOSTIC SERVEUR HOSTINGER - 224Solutions
 * Téléchargez ce fichier dans public_html/ et accédez via navigateur
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 Diagnostic Serveur - 224Solutions</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #0f0; }
        .section { background: #000; border: 1px solid #0f0; padding: 15px; margin: 10px 0; }
        .error { color: #f00; }
        .success { color: #0f0; }
        .warning { color: #ff0; }
        h2 { color: #00ffff; }
        pre { background: #222; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 DIAGNOSTIC SERVEUR HOSTINGER - 224SOLUTIONS</h1>
    
    <div class="section">
        <h2>📂 1. STRUCTURE DES FICHIERS</h2>
        <?php
        $rootDir = __DIR__;
        echo "<pre><strong>Répertoire actuel:</strong> $rootDir\n\n";
        
        $files = [
            'index.html' => 'Fichier principal',
            '.htaccess' => 'Configuration Apache',
            'assets/index-D-5ypUDY.js' => 'Bundle JavaScript principal',
            'assets/vendor-supabase-IdwS5Gfw.js' => 'Bundle Supabase',
            'favicon.png' => 'Favicon'
        ];
        
        foreach ($files as $file => $desc) {
            $path = "$rootDir/$file";
            if (file_exists($path)) {
                $size = filesize($path);
                echo "<span class='success'>✅ $file</span> ($desc) - " . number_format($size) . " bytes\n";
            } else {
                echo "<span class='error'>❌ $file MANQUANT</span> ($desc)\n";
            }
        }
        echo "</pre>";
        ?>
    </div>

    <div class="section">
        <h2>📄 2. CONTENU DE INDEX.HTML</h2>
        <?php
        $indexPath = "$rootDir/index.html";
        if (file_exists($indexPath)) {
            $indexContent = file_get_contents($indexPath);
            $hasRoot = strpos($indexContent, 'id="root"') !== false ? '✅' : '❌';
            $hasJS = strpos($indexContent, 'index-D-5ypUDY.js') !== false ? '✅' : '❌';
            $hasCSS = strpos($indexContent, 'index-D_0H4Ilb.css') !== false ? '✅' : '❌';
            
            echo "<pre>";
            echo "$hasRoot Élément &lt;div id=\"root\"&gt;\n";
            echo "$hasJS Script principal (index-D-5ypUDY.js)\n";
            echo "$hasCSS Feuille de style (index-D_0H4Ilb.css)\n";
            echo "\n<strong>Premiers 500 caractères:</strong>\n";
            echo htmlspecialchars(substr($indexContent, 0, 500));
            echo "</pre>";
        } else {
            echo "<p class='error'>❌ index.html n'existe pas!</p>";
        }
        ?>
    </div>

    <div class="section">
        <h2>⚙️ 3. CONTENU DE .HTACCESS</h2>
        <?php
        $htaccessPath = "$rootDir/.htaccess";
        if (file_exists($htaccessPath)) {
            $htaccessContent = file_get_contents($htaccessPath);
            $hasRewrite = strpos($htaccessContent, 'RewriteEngine On') !== false ? '✅' : '❌';
            $hasRule = strpos($htaccessContent, 'RewriteRule') !== false ? '✅' : '❌';
            
            echo "<pre>";
            echo "$hasRewrite RewriteEngine activé\n";
            echo "$hasRule RewriteRule présente\n\n";
            echo "<strong>Contenu complet:</strong>\n";
            echo htmlspecialchars($htaccessContent);
            echo "</pre>";
        } else {
            echo "<p class='error'>❌ .htaccess n'existe pas!</p>";
            echo "<p class='warning'>⚠️ CRÉEZ .htaccess avec ce contenu:</p>";
            echo "<pre>" . htmlspecialchars(file_get_contents('d:\224Solutions\dist\.htaccess')) . "</pre>";
        }
        ?>
    </div>

    <div class="section">
        <h2>🔌 4. MODULES APACHE</h2>
        <?php
        echo "<pre>";
        if (function_exists('apache_get_modules')) {
            $modules = apache_get_modules();
            $required = ['mod_rewrite', 'mod_deflate', 'mod_expires', 'mod_headers'];
            foreach ($required as $mod) {
                $status = in_array($mod, $modules) ? '✅' : '❌';
                echo "$status $mod\n";
            }
        } else {
            echo "<span class='warning'>⚠️ Impossible de vérifier les modules Apache</span>\n";
        }
        echo "</pre>";
    </div>

    <div class="section">
        <h2>🌐 5. CONFIGURATION PHP</h2>
        <?php
        echo "<pre>";
        echo "Version PHP: " . phpversion() . "\n";
        echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
        echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
        echo "Server Name: " . $_SERVER['SERVER_NAME'] . "\n";
        echo "</pre>";
    </div>

    <div class="section">
        <h2>📦 6. LISTE DES FICHIERS ASSETS/</h2>
        <?php
        $assetsDir = "$rootDir/assets";
        if (is_dir($assetsDir)) {
            $files = scandir($assetsDir);
            $jsFiles = array_filter($files, function($f) { return strpos($f, '.js') !== false; });
            $cssFiles = array_filter($files, function($f) { return strpos($f, '.css') !== false; });
            
            echo "<pre>";
            echo "<strong>Fichiers JavaScript:</strong> " . count($jsFiles) . " fichiers\n";
            foreach (array_slice($jsFiles, 0, 10) as $file) {
                $size = filesize("$assetsDir/$file");
                echo "  • $file - " . number_format($size) . " bytes\n";
            }
            if (count($jsFiles) > 10) {
                echo "  ... et " . (count($jsFiles) - 10) . " autres\n";
            }
            
            echo "\n<strong>Fichiers CSS:</strong> " . count($cssFiles) . " fichiers\n";
            foreach ($cssFiles as $file) {
                $size = filesize("$assetsDir/$file");
                echo "  • $file - " . number_format($size) . " bytes\n";
            }
            echo "</pre>";
        } else {
            echo "<p class='error'>❌ Dossier assets/ n'existe pas!</p>";
        }
        ?>
    </div>

    <div class="section">
        <h2>🔍 7. RECHERCHE SUPABASE DANS LE BUILD</h2>
        <?php
        $supabaseFile = "$rootDir/assets/vendor-supabase-IdwS5Gfw.js";
        if (file_exists($supabaseFile)) {
            $content = file_get_contents($supabaseFile);
            $hasSupabaseUrl = strpos($content, 'cjomojytxdjxbnstpfsg.supabase.co') !== false;
            
            echo "<pre>";
            if ($hasSupabaseUrl) {
                echo "<span class='success'>✅ URL Supabase TROUVÉE dans le build</span>\n";
                echo "Le fichier contient les credentials Supabase compilés.\n";
            } else {
                echo "<span class='error'>❌ URL Supabase ABSENTE du build</span>\n";
                echo "<span class='warning'>⚠️ Le build a été fait SANS les variables d'environnement!</span>\n";
                echo "\nSOLUTION: Rebuildez localement avec .env correctement configuré:\n";
                echo "  1. Vérifier que .env contient VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY\n";
                echo "  2. npm run build\n";
                echo "  3. Reuploader le dossier dist/\n";
            }
            echo "\nTaille du fichier: " . number_format(filesize($supabaseFile)) . " bytes\n";
            echo "</pre>";
        } else {
            echo "<p class='error'>❌ vendor-supabase-IdwS5Gfw.js n'existe pas!</p>";
        }
        ?>
    </div>

    <div class="section">
        <h2>✅ 8. DIAGNOSTIC FINAL</h2>
        <?php
        $issues = [];
        
        if (!file_exists("$rootDir/index.html")) $issues[] = "❌ index.html manquant";
        if (!file_exists("$rootDir/.htaccess")) $issues[] = "❌ .htaccess manquant";
        if (!is_dir("$rootDir/assets")) $issues[] = "❌ Dossier assets/ manquant";
        
        if (file_exists("$rootDir/assets/vendor-supabase-IdwS5Gfw.js")) {
            $content = file_get_contents("$rootDir/assets/vendor-supabase-IdwS5Gfw.js");
            if (strpos($content, 'cjomojytxdjxbnstpfsg.supabase.co') === false) {
                $issues[] = "❌ Variables Supabase absentes du build";
            }
        }
        
        if (empty($issues)) {
            echo "<p class='success' style='font-size: 20px;'>✅ TOUT EST CORRECT!</p>";
            echo "<p>Si le site affiche toujours une page blanche:</p>";
            echo "<ol>";
            echo "<li>Ouvrez F12 dans le navigateur</li>";
            echo "<li>Regardez l'onglet Console pour les erreurs JavaScript</li>";
            echo "<li>Regardez l'onglet Network pour les fichiers qui ne chargent pas</li>";
            echo "</ol>";
        } else {
            echo "<p class='error' style='font-size: 20px;'>❌ PROBLÈMES DÉTECTÉS:</p>";
            echo "<ul>";
            foreach ($issues as $issue) {
                echo "<li>$issue</li>";
            }
            echo "</ul>";
        }
        ?>
    </div>

    <div class="section">
        <h2>🚀 9. ACTIONS RECOMMANDÉES</h2>
        <ol>
            <li><strong>Si .htaccess manque:</strong> Créez-le avec le contenu ci-dessus</li>
            <li><strong>Si index.html est dans un sous-dossier:</strong> Déplacez tout le contenu de dist/ vers public_html/</li>
            <li><strong>Si variables Supabase manquent:</strong> Rebuildez localement puis reuploadez</li>
            <li><strong>Vérifiez le navigateur:</strong> F12 > Console pour voir les erreurs exactes</li>
        </ol>
    </div>
</body>
</html>
