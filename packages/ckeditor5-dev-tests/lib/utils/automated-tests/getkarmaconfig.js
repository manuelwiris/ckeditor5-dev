/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */
'use strict';

const path = require( 'path' );
const getWebpackConfigForAutomatedTests = require( './getwebpackconfig' );
const transformFileOptionToTestGlob = require( '../transformfileoptiontotestglob' );

const reporters = [
	'mocha',
	'dots'
];

const coverageDir = path.join( process.cwd(), 'coverage' );

/**
 * @param {Object} options
 * @returns {Object}
 */
module.exports = function getKarmaConfig( options ) {
	if ( !Array.isArray( options.files ) || options.files.length === 0 ) {
		throw new Error( 'Karma requires files to tests. `options.files` has to be non-empty array.' );
	}

	if ( !reporters.includes( options.reporter ) ) {
		throw new Error( `Given Mocha reporter is not supported. Available reporters: ${ reporters.join( ', ' ) }.` );
	}

	const files = options.files.map( file => transformFileOptionToTestGlob( file ) );

	const preprocessorMap = {};

	for ( const file of files ) {
		preprocessorMap[ file ] = [ 'webpack' ];

		if ( options.sourceMap ) {
			preprocessorMap[ file ].push( 'sourcemap' );
		}
	}

	const karmaConfig = {
		// Base path that will be used to resolve all patterns (eg. files, exclude).
		basePath: process.cwd(),

		// Frameworks to use. Available frameworks: https://npmjs.org/browse/keyword/karma-adapter
		frameworks: [ 'mocha', 'chai', 'sinon' ],

		// List of files/patterns to load in the browser.
		files,

		// List of files to exclude.
		exclude: [
			// Ignore all utils which aren't tests.
			path.join( '**', 'tests', '**', '_utils', '**', '*.js' ),

			// And all manual tests.
			path.join( '**', 'tests', '**', 'manual', '**', '*.js' )
		],

		// Preprocess matching files before serving them to the browser.
		// Available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
		preprocessors: preprocessorMap,

		webpack: getWebpackConfigForAutomatedTests( {
			files,
			sourceMap: options.sourceMap,
			coverage: options.coverage,
			themePath: options.themePath
		} ),

		webpackMiddleware: {
			noInfo: true,
			stats: {
				chunks: false
			}
		},

		// Test results reporter to use. Possible values: 'dots', 'progress'.
		// Available reporters: https://npmjs.org/browse/keyword/karma-reporter
		reporters: [ options.reporter ],

		// Web server port.
		port: 9876,

		// Enable/Disable colors in the output (reporters and logs).
		colors: true,

		// Level of logging. Possible values:
		// config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
		logLevel: 'INFO',

		// Start these browsers.
		// Available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
		browsers: getBrowsers( options ),

		customLaunchers: {
			CHROME_TRAVIS_CI: {
				base: 'Chrome',
				flags: [ '--no-sandbox', '--disable-background-timer-throttling' ]
			},
			CHROME_LOCAL: {
				base: 'Chrome',
				flags: [ '--disable-background-timer-throttling' ]
			},
			Windows_Edge: {
				base: 'BrowserStack',
				os: 'Windows',
				os_version: '10',
				browser: 'edge',
				browser_version: '16.0'
			},
			Mavericks_Chrome: {
				base: 'BrowserStack',
				os: 'OS X',
				os_version: 'Mavericks',
				browser: 'chrome',
				browser_version: '62.0'
			},
			Yosemite_Firefox: {
				base: 'BrowserStack',
				os: 'OS X',
				os_version: 'Yosemite',
				browser: 'firefox',
				browser_version: '57.0'
			},
			HighSierra_Safari: {
				base: 'BrowserStack',
				os: 'OS X',
				os_version: 'High Sierra',
				browser: 'safari',
				browser_version: '11.0'
			}
		},

		// Continuous Integration mode. If true, Karma captures browsers, runs the tests and exits.
		singleRun: true,

		// Concurrency level. How many browser should be started simultaneous.
		concurrency: Infinity,

		// How long will Karma wait for a message from a browser before disconnecting from it (in ms).
		browserNoActivityTimeout: 0,

		// Shows differences in object comparison.
		mochaReporter: {
			showDiff: true
		}
	};

	if ( options.watch || options.server ) {
		// Enable/Disable watching file and executing tests whenever any file changes.
		karmaConfig.autoWatch = true;
		karmaConfig.singleRun = false;
	}

	if ( options.verbose ) {
		karmaConfig.webpackMiddleware.noInfo = false;
		delete karmaConfig.webpackMiddleware.stats;
	}

	if ( options.browserStack ) {
		karmaConfig.browserStack = {
			username: options.username,
			accessKey: options.accessKey
		};

		karmaConfig.reporters = [ 'dots', 'BrowserStack' ];

		// If user does not specified browser, restore default value.
		if ( options.browsers.length === 1 && options.browsers[ 0 ] === 'CHROME_LOCAL' ) {
			options.browsers = [];
		}

		// Use all specified browsers connected with BrowserStack.
		karmaConfig.browsers = Object.keys( karmaConfig.customLaunchers )
			.filter( launcherName => karmaConfig.customLaunchers[ launcherName ].base === 'BrowserStack' );

		// If user specified browsers, filters out invalid ones.
		if ( options.browsers.length ) {
			karmaConfig.browsers = karmaConfig.browsers.filter( launcherName => {
				// Keys match to format: OperationSystem_Browser.
				const browserName = launcherName.split( '_' )[ 1 ].toLowerCase();

				return options.browsers.some( browserFromOptions => browserFromOptions.toLowerCase() === browserName );
			} );
		}
	}

	if ( options.coverage ) {
		karmaConfig.reporters.push( 'coverage' );

		karmaConfig.coverageReporter = {
			reporters: [
				{
					type: 'text-summary'
				},
				{
					dir: coverageDir,
					type: 'html'
				},
				// Generates "./coverage/lcov.info". Used by CodeClimate.
				{
					type: 'lcovonly',
					subdir: '.',
					dir: coverageDir
				}
			]
		};
	}

	return karmaConfig;
};

// Returns the value of Karma's browser option.
// @returns {Array|null}
function getBrowsers( options ) {
	if ( process.env.TRAVIS ) {
		return [ 'CHROME_TRAVIS_CI' ];
	}

	if ( options.server || !options.browsers ) {
		return null;
	}

	return options.browsers.map( browser => {
		if ( browser === 'Chrome' ) {
			return 'CHROME_LOCAL';
		}

		return browser;
	} );
}
