/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

const chalk = require( 'chalk' );
const semver = require( 'semver' );
const { tools, logger } = require( '@ckeditor/ckeditor5-dev-utils' );
const cli = require( '../utils/cli' );
const versionUtils = require( '../utils/versions' );
const changelogUtils = require( '../utils/changelog' );
const displayCommits = require( '../utils/displaycommits' );
const getPackageJson = require( '../utils/getpackagejson' );
const getNewReleaseType = require( '../utils/getnewreleasetype' );
const generateChangelogFromCommits = require( '../utils/generatechangelogfromcommits' );
const transformCommitFunction = require( '../utils/transform-commit/transformcommitforsubrepository' );

/**
 * Generates the release changelog based on commit messages in the repository.
 *
 * User can provide a version for the entry in changelog.
 *
 * If package does not have any commits, user has to confirm whether the changelog
 * should be generated.
 *
 * @param {Object} [options={}] Additional options.
 * @param {String} [options.newVersion=null] A version for which changelog will be generated.
 * @param {Boolean} [options.skipLinks=false] If set on true, links to release or commits will be omitted.
 * @returns {Promise}
 */
module.exports = function generateChangelogForSinglePackage( options = {} ) {
	const log = logger();
	const packageJson = getPackageJson();

	let tagName = versionUtils.getLastFromChangelog();

	if ( tagName ) {
		tagName = 'v' + tagName;
	}

	log.info( '' );
	log.info( chalk.bold.blue( `Generating changelog for "${ packageJson.name }"...` ) );

	const newVersion = options.newVersion || null;
	let promise = Promise.resolve();

	if ( !newVersion ) {
		promise = promise
			.then( () => {
				return getNewReleaseType( transformCommitFunction, { tagName } );
			} )
			.then( result => {
				displayCommits( result.commits );

				const newReleaseType = result.releaseType !== 'skip' ? result.releaseType : null;

				return cli.provideVersion( packageJson.version, newReleaseType );
			} );
	} else {
		promise = promise.then( () => newVersion );
	}

	return promise
		.then( version => {
			if ( version === 'skip' ) {
				return Promise.resolve();
			}

			let isInternalRelease = false;

			if ( version === 'internal' ) {
				isInternalRelease = true;
				version = semver.inc( packageJson.version, semver.prerelease( packageJson.version ) ? 'prerelease' : 'patch' );
			}

			const changelogOptions = {
				version,
				tagName,
				isInternalRelease,
				newTagName: 'v' + version,
				transformCommit: transformCommitFunction,
				skipLinks: !!options.skipLinks
			};

			return generateChangelogFromCommits( changelogOptions )
				.then( () => {
					tools.shExec( `git add ${ changelogUtils.changelogFile }`, { verbosity: 'error' } );
					tools.shExec( 'git commit -m "Docs: Changelog. [skip ci]"', { verbosity: 'error' } );

					log.info(
						chalk.green( `Changelog for "${ packageJson.name }" (v${ version }) has been generated.` )
					);

					return Promise.resolve( version );
				} );
		} );
};
