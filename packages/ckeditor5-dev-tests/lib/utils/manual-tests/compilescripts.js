/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint node: true, strict: true */

'use strict';

const path = require( 'path' );
const webpack = require( 'webpack' );
const globSync = require( '../glob' );
const getWebpackConfigForManualTests = require( './getwebpackconfig' );
const getRelativeFilePath = require( '../getrelativefilepath' );

/**
 * @param {String} buildDir A path where compiled files will be saved.
 * @param {Array.<String>} manualTestScriptsPatterns An array of patterns that resolve manual test scripts.
 * @param {String} themePath A path to the theme the PostCSS theme-importer plugin is supposed to load.
 * @returns {Promise}
 */
module.exports = function compileManualTestScripts( buildDir, manualTestScriptsPatterns, themePath ) {
	const entryFiles = manualTestScriptsPatterns.reduce( ( arr, manualTestPattern ) => {
		return [
			...arr,
			...globSync( manualTestPattern )
				.filter( manualTestFile => manualTestFile.includes( path.sep + 'manual' + path.sep ) )
		];
	}, [] );

	const entries = getWebpackEntryPoints( entryFiles );
	const webpackConfig = getWebpackConfigForManualTests( entries, buildDir, themePath );

	return runWebpack( webpackConfig );
};

/**
 * @returns {Promise}
 */
function runWebpack( webpackConfig ) {
	return new Promise( ( resolve, reject ) => {
		webpack( webpackConfig, err => {
			if ( err ) {
				reject( err );
			} else {
				resolve();
			}
		} );
	} );
}

function getWebpackEntryPoints( entryFiles ) {
	const entryObject = {};

	entryFiles.forEach( file => {
		entryObject[ getRelativeFilePath( file ).replace( /\.js$/, '' ) ] = file;
	} );

	return entryObject;
}
