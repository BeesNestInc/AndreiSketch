
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const LESSOPEN: string;
	export const UMS_MOUNTPOINT: string;
	export const GST_V4L2_PREFERRED_FOURCC: string;
	export const LANGUAGE: string;
	export const USER: string;
	export const SSH_CLIENT: string;
	export const npm_config_user_agent: string;
	export const XDG_SESSION_TYPE: string;
	export const BUN_INSTALL: string;
	export const npm_node_execpath: string;
	export const SHLVL: string;
	export const USB_FUNCS: string;
	export const npm_config_noproxy: string;
	export const MOTD_SHOWN: string;
	export const HOME: string;
	export const OLDPWD: string;
	export const SSH_TTY: string;
	export const npm_package_json: string;
	export const GST_INSPECT_NO_COLORS: string;
	export const npm_package_engines_node: string;
	export const GST_MPP_NO_RGA: string;
	export const COGL_DRIVER: string;
	export const NODE_OPTIONS: string;
	export const npm_config_userconfig: string;
	export const npm_config_local_prefix: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const COLORTERM: string;
	export const COLOR: string;
	export const NVM_DIR: string;
	export const GST_V4L2SRC_MAX_RESOLUTION: string;
	export const npm_config_audit: string;
	export const LOGNAME: string;
	export const _: string;
	export const npm_config_prefix: string;
	export const npm_config_npm_version: string;
	export const XDG_SESSION_CLASS: string;
	export const TERM: string;
	export const GST_GL_API: string;
	export const XDG_SESSION_ID: string;
	export const npm_config_cache: string;
	export const GST_VIDEO_CONVERT_PREFERRED_FORMAT: string;
	export const GST_V4L2SRC_RK_DEVICES: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const NODE: string;
	export const npm_package_name: string;
	export const XDG_RUNTIME_DIR: string;
	export const GST_GL_PLATFORM: string;
	export const GST_DEBUG_NO_COLOR: string;
	export const GST_V4L2SRC_DEFAULT_DEVICE: string;
	export const DISPLAY: string;
	export const LANG: string;
	export const DOTNET_BUNDLE_EXTRACT_BASE_DIR: string;
	export const LS_COLORS: string;
	export const npm_config_loglevel: string;
	export const npm_config_fund: string;
	export const npm_lifecycle_script: string;
	export const GST_V4L2_USE_LIBV4L2: string;
	export const UMS_SIZE: string;
	export const LC_MESSAGES: string;
	export const SHELL: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const UMS_RO: string;
	export const npm_config_update_notifier: string;
	export const LESSCLOSE: string;
	export const UMS_FSTYPE: string;
	export const EVIDENCE_DATA_URL_PREFIX: string;
	export const npm_config_globalconfig: string;
	export const npm_config_init_module: string;
	export const PWD: string;
	export const LC_ALL: string;
	export const npm_execpath: string;
	export const SSH_CONNECTION: string;
	export const XDG_DATA_DIRS: string;
	export const npm_config_global_prefix: string;
	export const npm_package_engines_npm: string;
	export const npm_command: string;
	export const UMS_MOUNT: string;
	export const VTE_VERSION: string;
	export const UMS_FILE: string;
	export const INIT_CWD: string;
	export const EDITOR: string;
	export const EVIDENCE_DATA_DIR: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		LESSOPEN: string;
		UMS_MOUNTPOINT: string;
		GST_V4L2_PREFERRED_FOURCC: string;
		LANGUAGE: string;
		USER: string;
		SSH_CLIENT: string;
		npm_config_user_agent: string;
		XDG_SESSION_TYPE: string;
		BUN_INSTALL: string;
		npm_node_execpath: string;
		SHLVL: string;
		USB_FUNCS: string;
		npm_config_noproxy: string;
		MOTD_SHOWN: string;
		HOME: string;
		OLDPWD: string;
		SSH_TTY: string;
		npm_package_json: string;
		GST_INSPECT_NO_COLORS: string;
		npm_package_engines_node: string;
		GST_MPP_NO_RGA: string;
		COGL_DRIVER: string;
		NODE_OPTIONS: string;
		npm_config_userconfig: string;
		npm_config_local_prefix: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		COLORTERM: string;
		COLOR: string;
		NVM_DIR: string;
		GST_V4L2SRC_MAX_RESOLUTION: string;
		npm_config_audit: string;
		LOGNAME: string;
		_: string;
		npm_config_prefix: string;
		npm_config_npm_version: string;
		XDG_SESSION_CLASS: string;
		TERM: string;
		GST_GL_API: string;
		XDG_SESSION_ID: string;
		npm_config_cache: string;
		GST_VIDEO_CONVERT_PREFERRED_FORMAT: string;
		GST_V4L2SRC_RK_DEVICES: string;
		npm_config_node_gyp: string;
		PATH: string;
		NODE: string;
		npm_package_name: string;
		XDG_RUNTIME_DIR: string;
		GST_GL_PLATFORM: string;
		GST_DEBUG_NO_COLOR: string;
		GST_V4L2SRC_DEFAULT_DEVICE: string;
		DISPLAY: string;
		LANG: string;
		DOTNET_BUNDLE_EXTRACT_BASE_DIR: string;
		LS_COLORS: string;
		npm_config_loglevel: string;
		npm_config_fund: string;
		npm_lifecycle_script: string;
		GST_V4L2_USE_LIBV4L2: string;
		UMS_SIZE: string;
		LC_MESSAGES: string;
		SHELL: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		UMS_RO: string;
		npm_config_update_notifier: string;
		LESSCLOSE: string;
		UMS_FSTYPE: string;
		EVIDENCE_DATA_URL_PREFIX: string;
		npm_config_globalconfig: string;
		npm_config_init_module: string;
		PWD: string;
		LC_ALL: string;
		npm_execpath: string;
		SSH_CONNECTION: string;
		XDG_DATA_DIRS: string;
		npm_config_global_prefix: string;
		npm_package_engines_npm: string;
		npm_command: string;
		UMS_MOUNT: string;
		VTE_VERSION: string;
		UMS_FILE: string;
		INIT_CWD: string;
		EDITOR: string;
		EVIDENCE_DATA_DIR: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
