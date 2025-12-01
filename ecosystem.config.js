/**
 * 🔧 CONFIGURATION PM2 - 224SOLUTIONS
 * Gestion des processus Node.js en production
 */

module.exports = {
  apps: [
    {
      name: '224solutions-api',
      script: './backend/src/server.js',
      instances: 2, // Cluster mode (utiliser max pour utiliser tous les CPU)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      
      // Logs
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart
      watch: false,
      max_memory_restart: '500M',
      
      // Gestion des crashes
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Autres options
      merge_logs: true,
      combine_logs: true,
      force: true
    },
    
    // Worker pour les tâches asynchrones (emails, notifs, etc.)
    {
      name: '224solutions-worker',
      script: './backend/src/jobs/worker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      autorestart: true,
      max_memory_restart: '300M',
      cron_restart: '0 */6 * * *' // Redémarrer toutes les 6h
    }
  ],
  
  deploy: {
    production: {
      user: 'root',
      host: 'VOTRE_VPS_IP',
      ref: 'origin/main',
      repo: 'git@github.com:VOTRE_REPO/224solutions.git',
      path: '/var/www/224solutions',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: 'StrictHostKeyChecking=no'
    }
  }
};
