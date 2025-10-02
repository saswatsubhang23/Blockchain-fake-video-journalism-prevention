#!/usr/bin/env node

/**
 * 🚀 Upgrade Script: Switch to Enhanced Archival Diplomatics
 * 
 * This script upgrades your current system to the enhanced version with:
 * - Advanced metadata validation
 * - Suspicious pattern detection  
 * - Enhanced graph relationships
 * - Trust score calculation
 * - Comprehensive fraud detection
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Starting Enhanced Archival Diplomatics Upgrade...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

try {
  // 1. Backup current files
  console.log('📦 Creating backup of current files...');
  
  const backupDir = path.join(projectRoot, 'backup_' + Date.now());
  fs.mkdirSync(backupDir, { recursive: true });
  
  // Backup critical files
  const filesToBackup = [
    'src/controllers/videoController.js',
    'src/services/neo4j.js',
    'src/routes/video.js',
    'package.json'
  ];
  
  filesToBackup.forEach(file => {
    const srcPath = path.join(projectRoot, file);
    const backupPath = path.join(backupDir, file);
    
    if (fs.existsSync(srcPath)) {
      // Create directory structure in backup
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(srcPath, backupPath);
      console.log(`   ✅ Backed up: ${file}`);
    }
  });
  
  console.log(`📁 Backup created at: ${backupDir}`);

  // 2. Upgrade to enhanced controllers
  console.log('\n🔄 Upgrading to enhanced controllers...');
  
  // Replace video controller
  const enhancedController = path.join(projectRoot, 'src/controllers/videoController_enhanced.js');
  const currentController = path.join(projectRoot, 'src/controllers/videoController.js');
  
  if (fs.existsSync(enhancedController)) {
    fs.copyFileSync(enhancedController, currentController);
    console.log('   ✅ Video controller upgraded');
  }

  // Replace Neo4j service
  const enhancedNeo4j = path.join(projectRoot, 'src/services/neo4j_enhanced.js');
  const currentNeo4j = path.join(projectRoot, 'src/services/neo4j.js');
  
  if (fs.existsSync(enhancedNeo4j)) {
    fs.copyFileSync(enhancedNeo4j, currentNeo4j);
    console.log('   ✅ Neo4j service upgraded');
  }

  // Replace routes
  const enhancedRoutes = path.join(projectRoot, 'src/routes/video_enhanced.js');
  const currentRoutes = path.join(projectRoot, 'src/routes/video.js');
  
  if (fs.existsSync(enhancedRoutes)) {
    fs.copyFileSync(enhancedRoutes, currentRoutes);
    console.log('   ✅ Video routes upgraded');
  }

  // Update package.json
  const enhancedPackage = path.join(projectRoot, 'package_enhanced.json');
  const currentPackage = path.join(projectRoot, 'package.json');
  
  if (fs.existsSync(enhancedPackage)) {
    fs.copyFileSync(enhancedPackage, currentPackage);
    console.log('   ✅ Package.json upgraded');
  }

  // 3. Update main interface
  console.log('\n🎨 Setting up enhanced interface...');
  
  const enhancedInterface = path.join(projectRoot, 'enhanced-interface.html');
  const mainInterface = path.join(projectRoot, 'test-interface.html');
  
  if (fs.existsSync(enhancedInterface)) {
    fs.copyFileSync(enhancedInterface, mainInterface);
    console.log('   ✅ Interface upgraded to enhanced version');
  }

  // 4. Show upgrade summary
  console.log('\n🎉 UPGRADE COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n🔥 NEW FEATURES ADDED:');
  console.log('   • 🕵️ Advanced metadata validation with tamper detection');
  console.log('   • 🔍 Suspicious pattern analysis (timestamp conflicts, rapid uploads)');
  console.log('   • 📊 Trust score calculation based on multiple factors');
  console.log('   • 🗄️ Enhanced Neo4j graph with relationships');
  console.log('   • 🔗 Content derivation tracking (parent-child relationships)');
  console.log('   • 📍 Location and GPS coordinate support');
  console.log('   • 🎪 Event classification and tagging');
  console.log('   • 📈 Advanced search and analytics endpoints');
  console.log('   • 🎯 Enhanced fraud detection algorithms');

  console.log('\n🚀 NEXT STEPS:');
  console.log('   1. Rebuild Docker container: docker compose up -d --build');
  console.log('   2. Initialize enhanced schema: npm run neo4j:init:enhanced');
  console.log('   3. Access enhanced interface: http://localhost:3000/test-interface.html');
  console.log('   4. Test new features with the comprehensive upload form');

  console.log('\n📋 NEW API ENDPOINTS:');
  console.log('   • POST /uploadVideo (enhanced with metadata validation)');
  console.log('   • GET /checkVideo/:hash (with relationship analysis)');
  console.log('   • GET /search (advanced video search)');
  console.log('   • GET /stats (system statistics)');
  console.log('   • GET /analyze/:hash (suspicious pattern analysis)');
  console.log('   • GET /relationships/:hash (graph relationships)');
  console.log('   • GET /chain/:hash (content derivation chain)');

  console.log('\n💾 BACKUP LOCATION:');
  console.log(`   📁 ${backupDir}`);
  
  console.log('\n✨ Your Enhanced Archival Diplomatics System is Ready!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

} catch (error) {
  console.error('❌ Upgrade failed:', error);
  console.log('\n🔄 To rollback, restore files from the backup directory');
  process.exit(1);
}

console.log('\n🎯 Ready to fight fake journalism with enhanced AI-powered detection! 🚀');