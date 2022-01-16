
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    // export let channel = writable('');
    let channel = '';

    function get_and_load_channel() {
        // channel.set(new URLSearchParams(window.location.search).get('c'));
        channel = new URLSearchParams(window.location.search).get('c');
        return channel;
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    function commonjsRequire (target) {
    	throw new Error('Could not dynamically require "' + target + '". Please configure the dynamicRequireTargets option of @rollup/plugin-commonjs appropriately for this require call to behave properly.');
    }

    var gun = createCommonjsModule(function (module) {
    (function(){

      /* UNBUILD */
      function USE(arg, req){
        return req? commonjsRequire(arg) : arg.slice? USE[R(arg)] : function(mod, path){
          arg(mod = {exports: {}});
          USE[R(path)] = mod.exports;
        }
        function R(p){
          return p.split('/').slice(-1).toString().replace('.js','');
        }
      }
      { var MODULE = module; }
    USE(function(module){
    		// Shim for generic javascript utilities.
    		String.random = function(l, c){
    			var s = '';
    			l = l || 24; // you are not going to make a 0 length random number, so no need to check type
    			c = c || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz';
    			while(l-- > 0){ s += c.charAt(Math.floor(Math.random() * c.length)); }
    			return s;
    		};
    		String.match = function(t, o){ var tmp, u;
    			if('string' !== typeof t){ return false }
    			if('string' == typeof o){ o = {'=': o}; }
    			o = o || {};
    			tmp = (o['='] || o['*'] || o['>'] || o['<']);
    			if(t === tmp){ return true }
    			if(u !== o['=']){ return false }
    			tmp = (o['*'] || o['>']);
    			if(t.slice(0, (tmp||'').length) === tmp){ return true }
    			if(u !== o['*']){ return false }
    			if(u !== o['>'] && u !== o['<']){
    				return (t >= o['>'] && t <= o['<'])? true : false;
    			}
    			if(u !== o['>'] && t >= o['>']){ return true }
    			if(u !== o['<'] && t <= o['<']){ return true }
    			return false;
    		};
    		String.hash = function(s, c){ // via SO
    			if(typeof s !== 'string'){ return }
    	    c = c || 0; // CPU schedule hashing by
    	    if(!s.length){ return c }
    	    for(var i=0,l=s.length,n; i<l; ++i){
    	      n = s.charCodeAt(i);
    	      c = ((c<<5)-c)+n;
    	      c |= 0;
    	    }
    	    return c;
    	  };
    		var has = Object.prototype.hasOwnProperty;
    		Object.plain = function(o){ return o? (o instanceof Object && o.constructor === Object) || Object.prototype.toString.call(o).match(/^\[object (\w+)\]$/)[1] === 'Object' : false };
    		Object.empty = function(o, n){
    			for(var k in o){ if(has.call(o, k) && (!n || -1==n.indexOf(k))){ return false } }
    			return true;
    		};
    		Object.keys = Object.keys || function(o){
    			var l = [];
    			for(var k in o){ if(has.call(o, k)){ l.push(k); } }
    			return l;
    		}
    		;(function(){ // max ~1ms or before stack overflow 
    			var u, sT = setTimeout, l = 0, c = 0, sI = (typeof setImmediate !== ''+u && setImmediate) || sT; // queueMicrotask faster but blocks UI
    			sT.poll = sT.poll || function(f){ //f(); return; // for testing
    				if((1 >= (+new Date - l)) && c++ < 3333){ f(); return }
    				sI(function(){ l = +new Date; f(); },c=0);
    			};
    		}());
    (function(){ // Too many polls block, this "threads" them in turns over a single thread in time.
    			var sT = setTimeout, t = sT.turn = sT.turn || function(f){ 1 == s.push(f) && p(T); }
    			, s = t.s = [], p = sT.poll, i = 0, f, T = function(){
    				if(f = s[i++]){ f(); }
    				if(i == s.length || 99 == i){
    					s = t.s = s.slice(i);
    					i = 0;
    				}
    				if(s.length){ p(T); }
    			};
    		}());
    (function(){
    			var u, sT = setTimeout, T = sT.turn;
    			(sT.each = sT.each || function(l,f,e,S){ S = S || 9; (function t(s,L,r){
    			  if(L = (s = (l||[]).splice(0,S)).length){
    			  	for(var i = 0; i < L; i++){
    			  		if(u !== (r = f(s[i]))){ break }
    			  	}
    			  	if(u === r){ T(t); return }
    			  } e && e(r);
    			}());})();
    		}());
    	})(USE, './shim');
    USE(function(module){
    		// On event emitter generic javascript utility.
    		module.exports = function onto(tag, arg, as){
    			if(!tag){ return {to: onto} }
    			var u, f = 'function' == typeof arg, tag = (this.tag || (this.tag = {}))[tag] || f && (
    				this.tag[tag] = {tag: tag, to: onto._ = { next: function(arg){ var tmp;
    					if(tmp = this.to){ tmp.next(arg); }
    			}}});
    			if(f){
    				var be = {
    					off: onto.off ||
    					(onto.off = function(){
    						if(this.next === onto._.next){ return !0 }
    						if(this === this.the.last){
    							this.the.last = this.back;
    						}
    						this.to.back = this.back;
    						this.next = onto._.next;
    						this.back.to = this.to;
    						if(this.the.last === this.the){
    							delete this.on.tag[this.the.tag];
    						}
    					}),
    					to: onto._,
    					next: arg,
    					the: tag,
    					on: this,
    					as: as,
    				};
    				(be.back = tag.last || tag).to = be;
    				return tag.last = be;
    			}
    			if((tag = tag.to) && u !== arg){ tag.next(arg); }
    			return tag;
    		};
    	})(USE, './onto');
    USE(function(module){
    		USE('./shim');
    		module.exports = function(v){ // Valid values are a subset of JSON: null, binary, number (!Infinity), text, or a soul relation. Arrays need special algorithms to handle concurrency, so they are not supported directly. Use an extension that supports them if needed but research their problems first.
    			if(v === undefined){ return false }
    			if(v === null){ return true } // "deletes", nulling out keys.
    			if(v === Infinity){ return false } // we want this to be, but JSON does not support it, sad face.
    			if(v !== v){ return false } // can you guess what this checks for? ;)
    			if('string' == typeof v // text!
    			|| 'boolean' == typeof v
    			|| 'number' == typeof v){
    				return true; // simple values are valid.
    			}
    			if(v && ('string' == typeof (v['#']||0)) && Object.empty(v, ['#'])){ return v['#'] } // is link
    			return false; // If not, everything else remaining is an invalid data type. Custom extensions can be built on top of these primitives to support other types.
    		};
    	})(USE, './valid');
    USE(function(module){
    		USE('./shim');
    		function State(){
    			var t = +new Date;
    			if(last < t){
    				return N = 0, last = t + State.drift;
    			}
    			return last = t + ((N += 1) / D) + State.drift;
    		}
    		State.drift = 0;
    		var NI = -Infinity, N = 0, D = 999, last = NI, u; // WARNING! In the future, on machines that are D times faster than 2016AD machines, you will want to increase D by another several orders of magnitude so the processing speed never out paces the decimal resolution (increasing an integer effects the state accuracy).
    		State.is = function(n, k, o){ // convenience function to get the state on a key on a node and return it.
    			var tmp = (k && n && n._ && n._['>']) || o;
    			if(!tmp){ return }
    			return ('number' == typeof (tmp = tmp[k]))? tmp : NI;
    		};
    		State.ify = function(n, k, s, v, soul){ // put a key's state on a node.
    			(n = n || {})._ = n._ || {}; // safety check or init.
    			if(soul){ n._['#'] = soul; } // set a soul if specified.
    			var tmp = n._['>'] || (n._['>'] = {}); // grab the states data.
    			if(u !== k && k !== '_'){
    				if('number' == typeof s){ tmp[k] = s; } // add the valid state.
    				if(u !== v){ n[k] = v; } // Note: Not its job to check for valid values!
    			}
    			return n;
    		};
    		module.exports = State;
    	})(USE, './state');
    USE(function(module){
    		USE('./shim');
    		function Dup(opt){
    			var dup = {s:{}}, s = dup.s;
    			opt = opt || {max: 999, age: 1000 * 9};//*/ 1000 * 9 * 3};
    			dup.check = function(id){
    				if(!s[id]){ return false }
    				return dt(id);
    			};
    			var dt = dup.track = function(id){
    				var it = s[id] || (s[id] = {});
    				it.was = dup.now = +new Date;
    				if(!dup.to){ dup.to = setTimeout(dup.drop, opt.age + 9); }
    				return it;
    			};
    			dup.drop = function(age){
    				dup.to = null;
    				dup.now = +new Date;
    				var l = Object.keys(s);
    				console.STAT && console.STAT(dup.now, +new Date - dup.now, 'dup drop keys'); // prev ~20% CPU 7% RAM 300MB // now ~25% CPU 7% RAM 500MB
    				setTimeout.each(l, function(id){ var it = s[id]; // TODO: .keys( is slow?
    					if(it && (age || opt.age) > (dup.now - it.was)){ return }
    					delete s[id];
    				},0,99);
    			};
    			return dup;
    		}
    		module.exports = Dup;
    	})(USE, './dup');
    USE(function(module){
    		// request / response module, for asking and acking messages.
    		USE('./onto'); // depends upon onto!
    		module.exports = function ask(cb, as){
    			if(!this.on){ return }
    			var lack = (this.opt||{}).lack || 9000;
    			if(!('function' == typeof cb)){
    				if(!cb){ return }
    				var id = cb['#'] || cb, tmp = (this.tag||'')[id];
    				if(!tmp){ return }
    				if(as){
    					tmp = this.on(id, as);
    					clearTimeout(tmp.err);
    					tmp.err = setTimeout(function(){ tmp.off(); }, lack);
    				}
    				return true;
    			}
    			var id = (as && as['#']) || random(9);
    			if(!cb){ return id }
    			var to = this.on(id, cb, as);
    			to.err = to.err || setTimeout(function(){ to.off();
    				to.next({err: "Error: No ACK yet.", lack: true});
    			}, lack);
    			return id;
    		};
    		var random = String.random || function(){ return Math.random().toString(36).slice(2) };
    	})(USE, './ask');
    USE(function(module){

    		function Gun(o){
    			if(o instanceof Gun){ return (this._ = {$: this}).$ }
    			if(!(this instanceof Gun)){ return new Gun(o) }
    			return Gun.create(this._ = {$: this, opt: o});
    		}

    		Gun.is = function($){ return ($ instanceof Gun) || ($ && $._ && ($ === $._.$)) || false };

    		Gun.version = 0.2020;

    		Gun.chain = Gun.prototype;
    		Gun.chain.toJSON = function(){};

    		USE('./shim');
    		Gun.valid = USE('./valid');
    		Gun.state = USE('./state');
    		Gun.on = USE('./onto');
    		Gun.dup = USE('./dup');
    		Gun.ask = USE('./ask');
    (function(){
    			Gun.create = function(at){
    				at.root = at.root || at;
    				at.graph = at.graph || {};
    				at.on = at.on || Gun.on;
    				at.ask = at.ask || Gun.ask;
    				at.dup = at.dup || Gun.dup();
    				var gun = at.$.opt(at.opt);
    				if(!at.once){
    					at.on('in', universe, at);
    					at.on('out', universe, at);
    					at.on('put', map, at);
    					Gun.on('create', at);
    					at.on('create', at);
    				}
    				at.once = 1;
    				return gun;
    			};
    			function universe(msg){
    				//if(!F){ var eve = this; setTimeout(function(){ universe.call(eve, msg,1) },Math.random() * 100);return; } // ADD F TO PARAMS!
    				if(!msg){ return }
    				if(msg.out === universe){ this.to.next(msg); return }
    				var eve = this, as = eve.as, at = as.at || as, gun = at.$, dup = at.dup, tmp, DBG = msg.DBG;
    				(tmp = msg['#']) || (tmp = msg['#'] = text_rand(9));
    				if(dup.check(tmp)){ return } dup.track(tmp);
    				tmp = msg._; msg._ = ('function' == typeof tmp)? tmp : function(){};
    				(msg.$ && (msg.$ === (msg.$._||'').$)) || (msg.$ = gun);
    				if(msg['@'] && !msg.put){ ack(msg); }
    				if(!at.ask(msg['@'], msg)){ // is this machine listening for an ack?
    					DBG && (DBG.u = +new Date);
    					if(msg.put){ put(msg); return } else
    					if(msg.get){ Gun.on.get(msg, gun); }
    				}
    				DBG && (DBG.uc = +new Date);
    				eve.to.next(msg);
    				DBG && (DBG.ua = +new Date);
    				if(msg.nts || msg.NTS){ return } // TODO: This shouldn't be in core, but fast way to prevent NTS spread. Delete this line after all peers have upgraded to newer versions.
    				msg.out = universe; at.on('out', msg);
    				DBG && (DBG.ue = +new Date);
    			}
    			function put(msg){
    				if(!msg){ return }
    				var ctx = msg._||'', root = ctx.root = ((ctx.$ = msg.$||'')._||'').root;
    				if(msg['@'] && ctx.faith && !ctx.miss){ // TODO: AXE may split/route based on 'put' what should we do here? Detect @ in AXE? I think we don't have to worry, as DAM will route it on @.
    					msg.out = universe;
    					root.on('out', msg);
    					return;
    				}
    				ctx.latch = root.hatch; ctx.match = root.hatch = [];
    				var put = msg.put;
    				var DBG = ctx.DBG = msg.DBG, S = +new Date;
    				if(put['#'] && put['.']){ /*root && root.on('put', msg);*/ return } // TODO: BUG! This needs to call HAM instead.
    				DBG && (DBG.p = S);
    				ctx['#'] = msg['#'];
    				ctx.msg = msg;
    				ctx.all = 0;
    				ctx.stun = 1;
    				var nl = Object.keys(put);//.sort(); // TODO: This is unbounded operation, large graphs will be slower. Write our own CPU scheduled sort? Or somehow do it in below? Keys itself is not O(1) either, create ES5 shim over ?weak map? or custom which is constant.
    				console.STAT && console.STAT(S, ((DBG||ctx).pk = +new Date) - S, 'put sort');
    				var ni = 0, nj, kl, soul, node, states, err, tmp;
    				(function pop(o){
    					if(nj != ni){ nj = ni;
    						if(!(soul = nl[ni])){
    							console.STAT && console.STAT(S, ((DBG||ctx).pd = +new Date) - S, 'put');
    							fire(ctx);
    							return;
    						}
    						if(!(node = put[soul])){ err = ERR+cut(soul)+"no node."; } else
    						if(!(tmp = node._)){ err = ERR+cut(soul)+"no meta."; } else
    						if(soul !== tmp['#']){ err = ERR+cut(soul)+"soul not same."; } else
    						if(!(states = tmp['>'])){ err = ERR+cut(soul)+"no state."; }
    						kl = Object.keys(node||{}); // TODO: .keys( is slow
    					}
    					if(err){
    						msg.err = ctx.err = err; // invalid data should error and stun the message.
    						fire(ctx);
    						//console.log("handle error!", err) // handle!
    						return;
    					}
    					var i = 0, key; o = o || 0;
    					while(o++ < 9 && (key = kl[i++])){
    						if('_' === key){ continue }
    						var val = node[key], state = states[key];
    						if(u === state){ err = ERR+cut(key)+"on"+cut(soul)+"no state."; break }
    						if(!valid(val)){ err = ERR+cut(key)+"on"+cut(soul)+"bad "+(typeof val)+cut(val); break }
    						//ctx.all++; //ctx.ack[soul+key] = '';
    						ham(val, key, soul, state, msg);
    					}
    					if((kl = kl.slice(i)).length){ turn(pop); return }
    					++ni; kl = null; pop(o);
    				}());
    			} Gun.on.put = put;
    			// TODO: MARK!!! clock below, reconnect sync, SEA certify wire merge, User.auth taking multiple times, // msg put, put, say ack, hear loop...
    			// WASIS BUG! first .once( undef 2nd good. .off othe rpeople: .open
    			function ham(val, key, soul, state, msg){
    				var ctx = msg._||'', root = ctx.root, graph = root.graph, tmp;
    				var vertex = graph[soul] || empty, was = state_is(vertex, key, 1), known = vertex[key];
    				
    				var DBG = ctx.DBG; if(tmp = console.STAT){ if(!graph[soul] || !known){ tmp.has = (tmp.has || 0) + 1; } }

    				var now = State();
    				if(state > now){
    					setTimeout(function(){ ham(val, key, soul, state, msg); }, (tmp = state - now) > MD? MD : tmp); // Max Defer 32bit. :(
    					console.STAT && console.STAT(((DBG||ctx).Hf = +new Date), tmp, 'future');
    					return;
    				}
    				if(state < was){ /*old;*/ if(!ctx.miss){ return } } // but some chains have a cache miss that need to re-fire. // TODO: Improve in future. // for AXE this would reduce rebroadcast, but GUN does it on message forwarding.
    				if(!ctx.faith){ // TODO: BUG? Can this be used for cache miss as well? // Yes this was a bug, need to check cache miss for RAD tests, but should we care about the faith check now? Probably not.
    					if(state === was && (val === known || L(val) <= L(known))){ /*console.log("same");*/ /*same;*/ if(!ctx.miss){ return } } // same
    				}
    				ctx.stun++; // TODO: 'forget' feature in SEA tied to this, bad approach, but hacked in for now. Any changes here must update there.
    				var aid = msg['#']+ctx.all++, id = {toString: function(){ return aid }, _: ctx}; id.toJSON = id.toString; // this *trick* makes it compatible between old & new versions.
    				DBG && (DBG.ph = DBG.ph || +new Date);
    				root.on('put', {'#': id, '@': msg['@'], put: {'#': soul, '.': key, ':': val, '>': state}, _: ctx});
    			}
    			function map(msg){
    				var DBG; if(DBG = (msg._||'').DBG){ DBG.pa = +new Date; DBG.pm = DBG.pm || +new Date;}
          	var eve = this, root = eve.as, graph = root.graph, ctx = msg._, put = msg.put, soul = put['#'], key = put['.'], val = put[':'], state = put['>']; msg['#']; var tmp;
          	if((tmp = ctx.msg) && (tmp = tmp.put) && (tmp = tmp[soul])){ state_ify(tmp, key, state, val, soul); } // necessary! or else out messages do not get SEA transforms.
    				graph[soul] = state_ify(graph[soul], key, state, val, soul);
    				if(tmp = (root.next||'')[soul]){ tmp.on('in', msg); }
    				fire(ctx);
    				eve.to.next(msg);
    			}
    			function fire(ctx, msg){ var root;
    				if(ctx.stop){ return }
    				if(!ctx.err && 0 < --ctx.stun){ return } // TODO: 'forget' feature in SEA tied to this, bad approach, but hacked in for now. Any changes here must update there.
    				ctx.stop = 1;
    				if(!(root = ctx.root)){ return }
    				var tmp = ctx.match; tmp.end = 1;
    				if(tmp === root.hatch){ if(!(tmp = ctx.latch) || tmp.end){ delete root.hatch; } else { root.hatch = tmp; } }
    				ctx.hatch && ctx.hatch(); // TODO: rename/rework how put & this interact.
    				setTimeout.each(ctx.match, function(cb){cb && cb();}); 
    				if(!(msg = ctx.msg) || ctx.err || msg.err){ return }
    				msg.out = universe;
    				ctx.root.on('out', msg);
    			}
    			function ack(msg){ // aggregate ACKs.
    				var id = msg['@'] || '', ctx;
    				if(!(ctx = id._)){ return }
    				ctx.acks = (ctx.acks||0) + 1;
    				if(ctx.err = msg.err){
    					msg['@'] = ctx['#'];
    					fire(ctx); // TODO: BUG? How it skips/stops propagation of msg if any 1 item is error, this would assume a whole batch/resync has same malicious intent.
    				}
    				if(!ctx.stop && !ctx.crack){ ctx.crack = ctx.match && ctx.match.push(function(){back(ctx);}); } // handle synchronous acks
    				back(ctx);
    			}
    			function back(ctx){
    				if(!ctx || !ctx.root){ return }
    				if(ctx.stun || ctx.acks !== ctx.all){ return }
    				ctx.root.on('in', {'@': ctx['#'], err: ctx.err, ok: ctx.err? u : {'':1}});
    			}

    			var ERR = "Error: Invalid graph!";
    			var cut = function(s){ return " '"+(''+s).slice(0,9)+"...' " };
    			var L = JSON.stringify, MD = 2147483647, State = Gun.state;

    		}());
    (function(){
    			Gun.on.get = function(msg, gun){
    				var root = gun._, get = msg.get, soul = get['#'], node = root.graph[soul], has = get['.'];
    				var next = root.next || (root.next = {}); next[soul];
    				// queue concurrent GETs?
    				// TODO: consider tagging original message into dup for DAM.
    				// TODO: ^ above? In chat app, 12 messages resulted in same peer asking for `#user.pub` 12 times. (same with #user GET too, yipes!) // DAM note: This also resulted in 12 replies from 1 peer which all had same ##hash but none of them deduped because each get was different.
    				// TODO: Moving quick hacks fixing these things to axe for now.
    				// TODO: a lot of GET #foo then GET #foo."" happening, why?
    				// TODO: DAM's ## hash check, on same get ACK, producing multiple replies still, maybe JSON vs YSON?
    				// TMP note for now: viMZq1slG was chat LEX query #.
    				/*if(gun !== (tmp = msg.$) && (tmp = (tmp||'')._)){
    					if(tmp.Q){ tmp.Q[msg['#']] = ''; return } // chain does not need to ask for it again.
    					tmp.Q = {};
    				}*/
    				/*if(u === has){
    					if(at.Q){
    						//at.Q[msg['#']] = '';
    						//return;
    					}
    					at.Q = {};
    				}*/
    				var ctx = msg._||{}, DBG = ctx.DBG = msg.DBG;
    				DBG && (DBG.g = +new Date);
    				//console.log("GET:", get, node, has);
    				if(!node){ return root.on('get', msg) }
    				if(has){
    					if('string' != typeof has || u === node[has]){ return root.on('get', msg) }
    					node = state_ify({}, has, state_is(node, has), node[has], soul);
    					// If we have a key in-memory, do we really need to fetch?
    					// Maybe... in case the in-memory key we have is a local write
    					// we still need to trigger a pull/merge from peers.
    				}
    				//Gun.window? Gun.obj.copy(node) : node; // HNPERF: If !browser bump Performance? Is this too dangerous to reference root graph? Copy / shallow copy too expensive for big nodes. Gun.obj.to(node); // 1 layer deep copy // Gun.obj.copy(node); // too slow on big nodes
    				node && ack(msg, node);
    				root.on('get', msg); // send GET to storage adapters.
    			};
    			function ack(msg, node){
    				var S = +new Date, ctx = msg._||{}, DBG = ctx.DBG = msg.DBG;
    				var to = msg['#'], id = text_rand(9), keys = Object.keys(node||'').sort(), soul = ((node||'')._||'')['#']; keys.length; var root = msg.$._.root, F = (node === root.graph[soul]);
    				console.STAT && console.STAT(S, ((DBG||ctx).gk = +new Date) - S, 'got keys');
    				// PERF: Consider commenting this out to force disk-only reads for perf testing? // TODO: .keys( is slow
    				node && (function go(){
    					S = +new Date;
    					var i = 0, k, put = {}, tmp;
    					while(i < 9 && (k = keys[i++])){
    						state_ify(put, k, state_is(node, k), node[k], soul);
    					}
    					keys = keys.slice(i);
    					(tmp = {})[soul] = put; put = tmp;
    					var faith; if(F){ faith = function(){}; faith.ram = faith.faith = true; } // HNPERF: We're testing performance improvement by skipping going through security again, but this should be audited.
    					tmp = keys.length;
    					console.STAT && console.STAT(S, -(S - (S = +new Date)), 'got copied some');
    					DBG && (DBG.ga = +new Date);
    					root.on('in', {'@': to, '#': id, put: put, '%': (tmp? (id = text_rand(9)) : u), $: root.$, _: faith, DBG: DBG});
    					console.STAT && console.STAT(S, +new Date - S, 'got in');
    					if(!tmp){ return }
    					setTimeout.turn(go);
    				}());
    				if(!node){ root.on('in', {'@': msg['#']}); } // TODO: I don't think I like this, the default lS adapter uses this but "not found" is a sensitive issue, so should probably be handled more carefully/individually.
    			} Gun.on.get.ack = ack;
    		}());
    (function(){
    			Gun.chain.opt = function(opt){
    				opt = opt || {};
    				var gun = this, at = gun._, tmp = opt.peers || opt;
    				if(!Object.plain(opt)){ opt = {}; }
    				if(!Object.plain(at.opt)){ at.opt = opt; }
    				if('string' == typeof tmp){ tmp = [tmp]; }
    				if(tmp instanceof Array){
    					if(!Object.plain(at.opt.peers)){ at.opt.peers = {};}
    					tmp.forEach(function(url){
    						var p = {}; p.id = p.url = url;
    						at.opt.peers[url] = at.opt.peers[url] || p;
    					});
    				}
    				at.opt.peers = at.opt.peers || {};
    				obj_each(opt, function each(k){ var v = this[k];
    					if((this && this.hasOwnProperty(k)) || 'string' == typeof v || Object.empty(v)){ this[k] = v; return }
    					if(v && v.constructor !== Object && !(v instanceof Array)){ return }
    					obj_each(v, each);
    				});
    				Gun.on('opt', at);
    				at.opt.uuid = at.opt.uuid || function uuid(l){ return Gun.state().toString(36).replace('.','') + String.random(l||12) };
    				return gun;
    			};
    		}());

    		var obj_each = function(o,f){ Object.keys(o).forEach(f,o); }, text_rand = String.random, turn = setTimeout.turn, valid = Gun.valid, state_is = Gun.state.is, state_ify = Gun.state.ify, u, empty = {}, C;

    		Gun.log = function(){ return (!Gun.log.off && C.log.apply(C, arguments)), [].slice.call(arguments).join(' ') };
    		Gun.log.once = function(w,s,o){ return (o = Gun.log.once)[w] = o[w] || 0, o[w]++ || Gun.log(s) };

    		if(typeof window !== "undefined"){ (window.GUN = window.Gun = Gun).window = window; }
    		try{ if(typeof MODULE !== "undefined"){ MODULE.exports = Gun; } }catch(e){}
    		module.exports = Gun;
    		
    		(Gun.window||{}).console = (Gun.window||{}).console || {log: function(){}};
    		(C = console).only = function(i, s){ return (C.only.i && i === C.only.i && C.only.i++) && (C.log.apply(C, arguments) || s) };
    		Gun.log.once("welcome", "Hello wonderful person! :) Thanks for using GUN, please ask for help on http://chat.gun.eco if anything takes you longer than 5min to figure out!");
    	})(USE, './root');
    USE(function(module){
    		var Gun = USE('./root');
    		Gun.chain.back = function(n, opt){ var tmp;
    			n = n || 1;
    			if(-1 === n || Infinity === n){
    				return this._.root.$;
    			} else
    			if(1 === n){
    				return (this._.back || this._).$;
    			}
    			var gun = this, at = gun._;
    			if(typeof n === 'string'){
    				n = n.split('.');
    			}
    			if(n instanceof Array){
    				var i = 0, l = n.length, tmp = at;
    				for(i; i < l; i++){
    					tmp = (tmp||empty)[n[i]];
    				}
    				if(u !== tmp){
    					return opt? gun : tmp;
    				} else
    				if((tmp = at.back)){
    					return tmp.$.back(n, opt);
    				}
    				return;
    			}
    			if('function' == typeof n){
    				var yes, tmp = {back: at};
    				while((tmp = tmp.back)
    				&& u === (yes = n(tmp, opt))){}
    				return yes;
    			}
    			if('number' == typeof n){
    				return (at.back || at).$.back(n - 1);
    			}
    			return this;
    		};
    		var empty = {}, u;
    	})(USE, './back');
    USE(function(module){
    		// WARNING: GUN is very simple, but the JavaScript chaining API around GUN
    		// is complicated and was extremely hard to build. If you port GUN to another
    		// language, consider implementing an easier API to build.
    		var Gun = USE('./root');
    		Gun.chain.chain = function(sub){
    			var gun = this, at = gun._, chain = new (sub || gun).constructor(gun), cat = chain._, root;
    			cat.root = root = at.root;
    			cat.id = ++root.once;
    			cat.back = gun._;
    			cat.on = Gun.on;
    			cat.on('in', Gun.on.in, cat); // For 'in' if I add my own listeners to each then I MUST do it before in gets called. If I listen globally for all incoming data instead though, regardless of individual listeners, I can transform the data there and then as well.
    			cat.on('out', Gun.on.out, cat); // However for output, there isn't really the global option. I must listen by adding my own listener individually BEFORE this one is ever called.
    			return chain;
    		};

    		function output(msg){
    			var get, at = this.as, back = at.back, root = at.root, tmp;
    			if(!msg.$){ msg.$ = at.$; }
    			this.to.next(msg);
    			if(at.err){ at.on('in', {put: at.put = u, $: at.$}); return }
    			if(get = msg.get){
    				/*if(u !== at.put){
    					at.on('in', at);
    					return;
    				}*/
    				if(root.pass){ root.pass[at.id] = at; } // will this make for buggy behavior elsewhere?
    				if(at.lex){ Object.keys(at.lex).forEach(function(k){ tmp[k] = at.lex[k]; }, tmp = msg.get = msg.get || {}); }
    				if(get['#'] || at.soul){
    					get['#'] = get['#'] || at.soul;
    					msg['#'] || (msg['#'] = text_rand(9)); // A3120 ?
    					back = (root.$.get(get['#'])._);
    					if(!(get = get['.'])){ // soul
    						tmp = back.ask && back.ask['']; // check if we have already asked for the full node
    						(back.ask || (back.ask = {}))[''] = back; // add a flag that we are now.
    						if(u !== back.put){ // if we already have data,
    							back.on('in', back); // send what is cached down the chain
    							if(tmp){ return } // and don't ask for it again.
    						}
    						msg.$ = back.$;
    					} else
    					if(obj_has(back.put, get)){ // TODO: support #LEX !
    						tmp = back.ask && back.ask[get];
    						(back.ask || (back.ask = {}))[get] = back.$.get(get)._;
    						back.on('in', {get: get, put: {'#': back.soul, '.': get, ':': back.put[get], '>': state_is(root.graph[back.soul], get)}});
    						if(tmp){ return }
    					}
    						/*put = (back.$.get(get)._);
    						if(!(tmp = put.ack)){ put.ack = -1 }
    						back.on('in', {
    							$: back.$,
    							put: Gun.state.ify({}, get, Gun.state(back.put, get), back.put[get]),
    							get: back.get
    						});
    						if(tmp){ return }
    					} else
    					if('string' != typeof get){
    						var put = {}, meta = (back.put||{})._;
    						Gun.obj.map(back.put, function(v,k){
    							if(!Gun.text.match(k, get)){ return }
    							put[k] = v;
    						})
    						if(!Gun.obj.empty(put)){
    							put._ = meta;
    							back.on('in', {$: back.$, put: put, get: back.get})
    						}
    						if(tmp = at.lex){
    							tmp = (tmp._) || (tmp._ = function(){});
    							if(back.ack < tmp.ask){ tmp.ask = back.ack }
    							if(tmp.ask){ return }
    							tmp.ask = 1;
    						}
    					}
    					*/
    					root.ask(ack, msg); // A3120 ?
    					return root.on('in', msg);
    				}
    				//if(root.now){ root.now[at.id] = root.now[at.id] || true; at.pass = {} }
    				if(get['.']){
    					if(at.get){
    						msg = {get: {'.': at.get}, $: at.$};
    						(back.ask || (back.ask = {}))[at.get] = msg.$._; // TODO: PERFORMANCE? More elegant way?
    						return back.on('out', msg);
    					}
    					msg = {get: at.lex? msg.get : {}, $: at.$};
    					return back.on('out', msg);
    				}
    				(at.ask || (at.ask = {}))[''] = at;	 //at.ack = at.ack || -1;
    				if(at.get){
    					get['.'] = at.get;
    					(back.ask || (back.ask = {}))[at.get] = msg.$._; // TODO: PERFORMANCE? More elegant way?
    					return back.on('out', msg);
    				}
    			}
    			return back.on('out', msg);
    		} Gun.on.out = output;

    		function input(msg, cat){ cat = cat || this.as; // TODO: V8 may not be able to optimize functions with different parameter calls, so try to do benchmark to see if there is any actual difference.
    			var root = cat.root, gun = msg.$ || (msg.$ = cat.$), at = (gun||'')._ || empty, tmp = msg.put||'', soul = tmp['#'], key = tmp['.'], change = (u !== tmp['='])? tmp['='] : tmp[':'], state = tmp['>'] || -Infinity, sat; // eve = event, at = data at, cat = chain at, sat = sub at (children chains).
    			if(u !== msg.put && (u === tmp['#'] || u === tmp['.'] || (u === tmp[':'] && u === tmp['=']) || u === tmp['>'])){ // convert from old format
    				if(!valid(tmp)){
    					if(!(soul = ((tmp||'')._||'')['#'])){ console.log("chain not yet supported for", tmp, '...', msg, cat); return; }
    					gun = cat.root.$.get(soul);
    					return setTimeout.each(Object.keys(tmp).sort(), function(k){ // TODO: .keys( is slow // BUG? ?Some re-in logic may depend on this being sync?
    						if('_' == k || u === (state = state_is(tmp, k))){ return }
    						cat.on('in', {$: gun, put: {'#': soul, '.': k, '=': tmp[k], '>': state}, VIA: msg});
    					});
    				}
    				cat.on('in', {$: at.back.$, put: {'#': soul = at.back.soul, '.': key = at.has || at.get, '=': tmp, '>': state_is(at.back.put, key)}, via: msg}); // TODO: This could be buggy! It assumes/approxes data, other stuff could have corrupted it.
    				return;
    			}
    			if((msg.seen||'')[cat.id]){ return } (msg.seen || (msg.seen = function(){}))[cat.id] = cat; // help stop some infinite loops

    			if(cat !== at){ // don't worry about this when first understanding the code, it handles changing contexts on a message. A soul chain will never have a different context.
    				Object.keys(msg).forEach(function(k){ tmp[k] = msg[k]; }, tmp = {}); // make copy of message
    				tmp.get = cat.get || tmp.get;
    				if(!cat.soul && !cat.has){ // if we do not recognize the chain type
    					tmp.$$$ = tmp.$$$ || cat.$; // make a reference to wherever it came from.
    				} else
    				if(at.soul){ // a has (property) chain will have a different context sometimes if it is linked (to a soul chain). Anything that is not a soul or has chain, will always have different contexts.
    					tmp.$ = cat.$;
    					tmp.$$ = tmp.$$ || at.$;
    				}
    				msg = tmp; // use the message with the new context instead;
    			}
    			unlink(msg, cat);

    			if(((cat.soul/* && (cat.ask||'')['']*/) || msg.$$) && state >= state_is(root.graph[soul], key)){ // The root has an in-memory cache of the graph, but if our peer has asked for the data then we want a per deduplicated chain copy of the data that might have local edits on it.
    				(tmp = root.$.get(soul)._).put = state_ify(tmp.put, key, state, change, soul);
    			}
    			if(!at.soul /*&& (at.ask||'')['']*/ && state >= state_is(root.graph[soul], key) && (sat = (root.$.get(soul)._.next||'')[key])){ // Same as above here, but for other types of chains. // TODO: Improve perf by preventing echoes recaching.
    				sat.put = change; // update cache
    				if('string' == typeof (tmp = valid(change))){
    					sat.put = root.$.get(tmp)._.put || change; // share same cache as what we're linked to.
    				}
    			}

    			this.to && this.to.next(msg); // 1st API job is to call all chain listeners.
    			// TODO: Make input more reusable by only doing these (some?) calls if we are a chain we recognize? This means each input listener would be responsible for when listeners need to be called, which makes sense, as they might want to filter.
    			cat.any && setTimeout.each(Object.keys(cat.any), function(any){ (any = cat.any[any]) && any(msg); },0,99); // 1st API job is to call all chain listeners. // TODO: .keys( is slow // BUG: Some re-in logic may depend on this being sync.
    			cat.echo && setTimeout.each(Object.keys(cat.echo), function(lat){ (lat = cat.echo[lat]) && lat.on('in', msg); },0,99); // & linked at chains // TODO: .keys( is slow // BUG: Some re-in logic may depend on this being sync.

    			if(((msg.$$||'')._||at).soul){ // comments are linear, but this line of code is non-linear, so if I were to comment what it does, you'd have to read 42 other comments first... but you can't read any of those comments until you first read this comment. What!? // shouldn't this match link's check?
    				// is there cases where it is a $$ that we do NOT want to do the following? 
    				if((sat = cat.next) && (sat = sat[key])){ // TODO: possible trick? Maybe have `ionmap` code set a sat? // TODO: Maybe we should do `cat.ask` instead? I guess does not matter.
    					tmp = {}; Object.keys(msg).forEach(function(k){ tmp[k] = msg[k]; });
    					tmp.$ = (msg.$$||msg.$).get(tmp.get = key); delete tmp.$$; delete tmp.$$$;
    					sat.on('in', tmp);
    				}
    			}

    			link(msg, cat);
    		} Gun.on.in = input;

    		function link(msg, cat){ cat = cat || this.as || msg.$._;
    			if(msg.$$ && this !== Gun.on){ return } // $$ means we came from a link, so we are at the wrong level, thus ignore it unless overruled manually by being called directly.
    			if(!msg.put || cat.soul){ return } // But you cannot overrule being linked to nothing, or trying to link a soul chain - that must never happen.
    			var put = msg.put||'', link = put['=']||put[':'], tmp;
    			var root = cat.root, tat = root.$.get(put['#']).get(put['.'])._;
    			if('string' != typeof (link = valid(link))){
    				if(this === Gun.on){ (tat.echo || (tat.echo = {}))[cat.id] = cat; } // allow some chain to explicitly force linking to simple data.
    				return; // by default do not link to data that is not a link.
    			}
    			if((tat.echo || (tat.echo = {}))[cat.id] // we've already linked ourselves so we do not need to do it again. Except... (annoying implementation details)
    				&& !(root.pass||'')[cat.id]){ return } // if a new event listener was added, we need to make a pass through for it. The pass will be on the chain, not always the chain passed down. 
    			if(tmp = root.pass){ if(tmp[link+cat.id]){ return } tmp[link+cat.id] = 1; } // But the above edge case may "pass through" on a circular graph causing infinite passes, so we hackily add a temporary check for that.

    			(tat.echo||(tat.echo={}))[cat.id] = cat; // set ourself up for the echo! // TODO: BUG? Echo to self no longer causes problems? Confirm.

    			if(cat.has){ cat.link = link; }
    			var sat = root.$.get(tat.link = link)._; // grab what we're linking to.
    			(sat.echo || (sat.echo = {}))[tat.id] = tat; // link it.
    			var tmp = cat.ask||''; // ask the chain for what needs to be loaded next!
    			if(tmp[''] || cat.lex){ // we might need to load the whole thing // TODO: cat.lex probably has edge case bugs to it, need more test coverage.
    				sat.on('out', {get: {'#': link}});
    			}
    			setTimeout.each(Object.keys(tmp), function(get, sat){ // if sub chains are asking for data. // TODO: .keys( is slow // BUG? ?Some re-in logic may depend on this being sync?
    				if(!get || !(sat = tmp[get])){ return }
    				sat.on('out', {get: {'#': link, '.': get}}); // go get it.
    			},0,99);
    		} Gun.on.link = link;

    		function unlink(msg, cat){ // ugh, so much code for seemingly edge case behavior.
    			var put = msg.put||'', change = (u !== put['='])? put['='] : put[':'], root = cat.root, link, tmp;
    			if(u === change){ // 1st edge case: If we have a brand new database, no data will be found.
    				// TODO: BUG! because emptying cache could be async from below, make sure we are not emptying a newer cache. So maybe pass an Async ID to check against?
    				// TODO: BUG! What if this is a map? // Warning! Clearing things out needs to be robust against sync/async ops, or else you'll see `map val get put` test catastrophically fail because map attempts to link when parent graph is streamed before child value gets set. Need to differentiate between lack acks and force clearing.
    				if(cat.soul && u !== cat.put){ return } // data may not be found on a soul, but if a soul already has data, then nothing can clear the soul as a whole.
    				//if(!cat.has){ return }
    				tmp = (msg.$$||msg.$||'')._||'';
    				if(msg['@'] && (u !== tmp.put || u !== cat.put)){ return } // a "not found" from other peers should not clear out data if we have already found it.
    				//if(cat.has && u === cat.put && !(root.pass||'')[cat.id]){ return } // if we are already unlinked, do not call again, unless edge case. // TODO: BUG! This line should be deleted for "unlink deeply nested".
    				if(link = cat.link || msg.linked){
    					delete (root.$.get(link)._.echo||'')[cat.id];
    				}
    				if(cat.has){ // TODO: Empty out links, maps, echos, acks/asks, etc.?
    					cat.link = null;
    				}
    				cat.put = u; // empty out the cache if, for example, alice's car's color no longer exists (relative to alice) if alice no longer has a car.
    				// TODO: BUG! For maps, proxy this so the individual sub is triggered, not all subs.
    				setTimeout.each(Object.keys(cat.next||''), function(get, sat){ // empty out all sub chains. // TODO: .keys( is slow // BUG? ?Some re-in logic may depend on this being sync? // TODO: BUG? This will trigger deeper put first, does put logic depend on nested order? // TODO: BUG! For map, this needs to be the isolated child, not all of them.
    					if(!(sat = cat.next[get])){ return }
    					//if(cat.has && u === sat.put && !(root.pass||'')[sat.id]){ return } // if we are already unlinked, do not call again, unless edge case. // TODO: BUG! This line should be deleted for "unlink deeply nested".
    					if(link){ delete (root.$.get(link).get(get)._.echo||'')[sat.id]; }
    					sat.on('in', {get: get, put: u, $: sat.$}); // TODO: BUG? Add recursive seen check?
    				},0,99);
    				return;
    			}
    			if(cat.soul){ return } // a soul cannot unlink itself.
    			if(msg.$$){ return } // a linked chain does not do the unlinking, the sub chain does. // TODO: BUG? Will this cancel maps?
    			link = valid(change); // need to unlink anytime we are not the same link, though only do this once per unlink (and not on init).
    			tmp = msg.$._||'';
    			if(link === tmp.link || (cat.has && !tmp.link)){
    				if((root.pass||'')[cat.id] && 'string' !== typeof link); else {
    					return;
    				}
    			}
    			delete (tmp.echo||'')[cat.id];
    			unlink({get: cat.get, put: u, $: msg.$, linked: msg.linked = msg.linked || tmp.link}, cat); // unlink our sub chains.
    		} Gun.on.unlink = unlink;

    		function ack(msg, ev){
    			//if(!msg['%'] && (this||'').off){ this.off() } // do NOT memory leak, turn off listeners! Now handled by .ask itself
    			// manhattan:
    			var as = this.as, at = as.$._; at.root; var get = as.get||'', tmp = (msg.put||'')[get['#']]||'';
    			if(!msg.put || ('string' == typeof get['.'] && u === tmp[get['.']])){
    				if(u !== at.put){ return }
    				if(!at.soul && !at.has){ return } // TODO: BUG? For now, only core-chains will handle not-founds, because bugs creep in if non-core chains are used as $ but we can revisit this later for more powerful extensions.
    				at.ack = (at.ack || 0) + 1;
    				at.on('in', {
    					get: at.get,
    					put: at.put = u,
    					$: at.$,
    					'@': msg['@']
    				});
    				/*(tmp = at.Q) && setTimeout.each(Object.keys(tmp), function(id){ // TODO: Temporary testing, not integrated or being used, probably delete.
    					Object.keys(msg).forEach(function(k){ tmp[k] = msg[k] }, tmp = {}); tmp['@'] = id; // copy message
    					root.on('in', tmp);
    				}); delete at.Q;*/
    				return;
    			}
    			(msg._||{}).miss = 1;
    			Gun.on.put(msg);
    			return; // eom
    		}

    		var empty = {}, u, text_rand = String.random, valid = Gun.valid, obj_has = function(o, k){ return o && Object.prototype.hasOwnProperty.call(o, k) }, state = Gun.state, state_is = state.is, state_ify = state.ify;
    	})(USE, './chain');
    USE(function(module){
    		var Gun = USE('./root');
    		Gun.chain.get = function(key, cb, as){
    			var gun, tmp;
    			if(typeof key === 'string'){
    				if(key.length == 0) {	
    					(gun = this.chain())._.err = {err: Gun.log('0 length key!', key)};
    					if(cb){ cb.call(gun, gun._.err); }
    					return gun;
    				}
    				var back = this, cat = back._;
    				var next = cat.next || empty;
    				if(!(gun = next[key])){
    					gun = key && cache(key, back);
    				}
    				gun = gun && gun.$;
    			} else
    			if('function' == typeof key){
    				if(true === cb){ return soul(this, key, cb, as), this }
    				gun = this;
    				var cat = gun._, opt = cb || {}, root = cat.root, id;
    				opt.at = cat;
    				opt.ok = key;
    				var wait = {}; // can we assign this to the at instead, like in once?
    				//var path = []; cat.$.back(at => { at.get && path.push(at.get.slice(0,9))}); path = path.reverse().join('.');
    				function any(msg, eve, f){
    					if(any.stun){ return }
    					if((tmp = root.pass) && !tmp[id]){ return }
    					var at = msg.$._, sat = (msg.$$||'')._, data = (sat||at).put, odd = (!at.has && !at.soul), test = {}, tmp;
    					if(odd || u === data){ // handles non-core
    						data = (u === ((tmp = msg.put)||'')['='])? (u === (tmp||'')[':'])? tmp : tmp[':'] : tmp['='];
    					}
    					if(('string' == typeof (tmp = Gun.valid(data)))){
    						data = (u === (tmp = root.$.get(tmp)._.put))? opt.not? u : data : tmp;
    					}
    					if(opt.not && u === data){ return }
    					if(u === opt.stun){
    						if((tmp = root.stun) && tmp.on){
    							cat.$.back(function(a){ // our chain stunned?
    								tmp.on(''+a.id, test = {});
    								if((test.run || 0) < any.id){ return test } // if there is an earlier stun on gapless parents/self.
    							});
    							!test.run && tmp.on(''+at.id, test = {}); // this node stunned?
    							!test.run && sat && tmp.on(''+sat.id, test = {}); // linked node stunned?
    							if(any.id > test.run){
    								if(!test.stun || test.stun.end){
    									test.stun = tmp.on('stun');
    									test.stun = test.stun && test.stun.last;
    								}
    								if(test.stun && !test.stun.end){
    									//if(odd && u === data){ return }
    									//if(u === msg.put){ return } // "not found" acks will be found if there is stun, so ignore these.
    									(test.stun.add || (test.stun.add = {}))[id] = function(){ any(msg,eve,1); }; // add ourself to the stun callback list that is called at end of the write.
    									return;
    								}
    							}
    						}
    						if(/*odd &&*/ u === data){ f = 0; } // if data not found, keep waiting/trying.
    						/*if(f && u === data){
    							cat.on('out', opt.out);
    							return;
    						}*/
    						if((tmp = root.hatch) && !tmp.end && u === opt.hatch && !f){ // quick hack! // What's going on here? Because data is streamed, we get things one by one, but a lot of developers would rather get a callback after each batch instead, so this does that by creating a wait list per chain id that is then called at the end of the batch by the hatch code in the root put listener.
    							if(wait[at.$._.id]){ return } wait[at.$._.id] = 1;
    							tmp.push(function(){any(msg,eve,1);});
    							return;
    						} wait = {}; // end quick hack.
    					}
    					// call:
    					if(root.pass){ if(root.pass[id+at.id]){ return } root.pass[id+at.id] = 1; }
    					if(opt.on){ opt.ok.call(at.$, data, at.get, msg, eve || any); return } // TODO: Also consider breaking `this` since a lot of people do `=>` these days and `.call(` has slower performance.
    					if(opt.v2020){ opt.ok(msg, eve || any); return }
    					Object.keys(msg).forEach(function(k){ tmp[k] = msg[k]; }, tmp = {}); msg = tmp; msg.put = data; // 2019 COMPATIBILITY! TODO: GET RID OF THIS!
    					opt.ok.call(opt.as, msg, eve || any); // is this the right
    				}				any.at = cat;
    				//(cat.any||(cat.any=function(msg){ setTimeout.each(Object.keys(cat.any||''), function(act){ (act = cat.any[act]) && act(msg) },0,99) }))[id = String.random(7)] = any; // maybe switch to this in future?
    				(cat.any||(cat.any={}))[id = String.random(7)] = any;
    				any.off = function(){ any.stun = 1; if(!cat.any){ return } delete cat.any[id]; };
    				any.rid = rid; // logic from old version, can we clean it up now?
    				any.id = opt.run || ++root.once; // used in callback to check if we are earlier than a write. // will this ever cause an integer overflow?
    				tmp = root.pass; (root.pass = {})[id] = 1; // Explanation: test trade-offs want to prevent recursion so we add/remove pass flag as it gets fulfilled to not repeat, however map map needs many pass flags - how do we reconcile?
    				opt.out = opt.out || {get: {}};
    				cat.on('out', opt.out);
    				root.pass = tmp;
    				return gun;
    			} else
    			if('number' == typeof key){
    				return this.get(''+key, cb, as);
    			} else
    			if('string' == typeof (tmp = valid(key))){
    				return this.get(tmp, cb, as);
    			} else
    			if(tmp = this.get.next){
    				gun = tmp(this, key);
    			}
    			if(!gun){
    				(gun = this.chain())._.err = {err: Gun.log('Invalid get request!', key)}; // CLEAN UP
    				if(cb){ cb.call(gun, gun._.err); }
    				return gun;
    			}
    			if(cb && 'function' == typeof cb){
    				gun.get(cb, as);
    			}
    			return gun;
    		};
    		function cache(key, back){
    			var cat = back._, next = cat.next, gun = back.chain(), at = gun._;
    			if(!next){ next = cat.next = {}; }
    			next[at.get = key] = at;
    			if(back === cat.root.$){
    				at.soul = key;
    			} else
    			if(cat.soul || cat.has){
    				at.has = key;
    				//if(obj_has(cat.put, key)){
    					//at.put = cat.put[key];
    				//}
    			}
    			return at;
    		}
    		function soul(gun, cb, opt, as){
    			var cat = gun._, acks = 0, tmp;
    			if(tmp = cat.soul || cat.link){ return cb(tmp, as, cat) }
    			if(cat.jam){ return cat.jam.push([cb, as]) }
    			cat.jam = [[cb,as]];
    			gun.get(function go(msg, eve){
    				if(u === msg.put && !cat.root.opt.super && (tmp = Object.keys(cat.root.opt.peers).length) && ++acks <= tmp){ // TODO: super should not be in core code, bring AXE up into core instead to fix? // TODO: .keys( is slow
    					return;
    				}
    				eve.rid(msg);
    				var at = ((at = msg.$) && at._) || {}, i = 0, as;
    				tmp = cat.jam; delete cat.jam; // tmp = cat.jam.splice(0, 100);
    				//if(tmp.length){ process.nextTick(function(){ go(msg, eve) }) }
    				while(as = tmp[i++]){ //Gun.obj.map(tmp, function(as, cb){
    					var cb = as[0]; as = as[1];
    					cb && cb(at.link || at.soul || Gun.valid(msg.put) || ((msg.put||{})._||{})['#'], as, msg, eve);
    				} //);
    			}, {out: {get: {'.':true}}});
    			return gun;
    		}
    		function rid(at){
    			var cat = this.at || this.on;
    			if(!at || cat.soul || cat.has){ return this.off() }
    			if(!(at = (at = (at = at.$ || at)._ || at).id)){ return }
    			cat.map; var seen;
    			//if(!map || !(tmp = map[at]) || !(tmp = tmp.at)){ return }
    			if((seen = this.seen || (this.seen = {}))[at]){ return true }
    			seen[at] = true;
    			return;
    		}
    		var empty = {}, valid = Gun.valid, u;
    	})(USE, './get');
    USE(function(module){
    		var Gun = USE('./root');
    		Gun.chain.put = function(data, cb, as){ // I rewrote it :)
    			var gun = this, at = gun._, root = at.root;
    			as = as || {};
    			as.root = at.root;
    			as.run || (as.run = root.once);
    			stun(as, at.id); // set a flag for reads to check if this chain is writing.
    			as.ack = as.ack || cb;
    			as.via = as.via || gun;
    			as.data = as.data || data;
    			as.soul || (as.soul = at.soul || ('string' == typeof cb && cb));
    			var s = as.state = as.state || Gun.state();
    			if('function' == typeof data){ data(function(d){ as.data = d; gun.put(u,u,as); }); return gun }
    			if(!as.soul){ return get(as), gun }
    			as.$ = root.$.get(as.soul); // TODO: This may not allow user chaining and similar?
    			as.todo = [{it: as.data, ref: as.$}];
    			as.turn = as.turn || turn;
    			as.ran = as.ran || ran;
    			//var path = []; as.via.back(at => { at.get && path.push(at.get.slice(0,9)) }); path = path.reverse().join('.');
    			// TODO: Perf! We only need to stun chains that are being modified, not necessarily written to.
    			(function walk(){
    				var to = as.todo, at = to.pop(), d = at.it; at.ref && at.ref._.id; var v, k, cat, tmp, g;
    				stun(as, at.ref);
    				if(tmp = at.todo){
    					k = tmp.pop(); d = d[k];
    					if(tmp.length){ to.push(at); }
    				}
    				k && (to.path || (to.path = [])).push(k);
    				if(!(v = valid(d)) && !(g = Gun.is(d))){
    					if(!Object.plain(d)){ (as.ack||noop).call(as, as.out = {err: as.err = Gun.log("Invalid data: " + ((d && (tmp = d.constructor) && tmp.name) || typeof d) + " at " + (as.via.back(function(at){at.get && tmp.push(at.get);}, tmp = []) || tmp.join('.'))+'.'+(to.path||[]).join('.'))}); as.ran(as); return }
    					var seen = as.seen || (as.seen = []), i = seen.length;
    					while(i--){ if(d === (tmp = seen[i]).it){ v = d = tmp.link; break } }
    				}
    				if(k && v){ at.node = state_ify(at.node, k, s, d); } // handle soul later.
    				else {
    					as.seen.push(cat = {it: d, link: {}, todo: g? [] : Object.keys(d).sort().reverse(), path: (to.path||[]).slice(), up: at}); // Any perf reasons to CPU schedule this .keys( ?
    					at.node = state_ify(at.node, k, s, cat.link);
    					!g && cat.todo.length && to.push(cat);
    					// ---------------
    					var id = as.seen.length;
    					(as.wait || (as.wait = {}))[id] = '';
    					tmp = (cat.ref = (g? d : k? at.ref.get(k) : at.ref))._;
    					(tmp = (d && (d._||'')['#']) || tmp.soul || tmp.link)? resolve({soul: tmp}) : cat.ref.get(resolve, {run: as.run, /*hatch: 0,*/ v2020:1, out:{get:{'.':' '}}}); // TODO: BUG! This should be resolve ONLY soul to prevent full data from being loaded. // Fixed now?
    					//setTimeout(function(){ if(F){ return } console.log("I HAVE NOT BEEN CALLED!", path, id, cat.ref._.id, k) }, 9000); var F; // MAKE SURE TO ADD F = 1 below!
    					function resolve(msg, eve){
    						var end = cat.link['#'];
    						if(eve){ eve.off(); eve.rid(msg); } // TODO: Too early! Check all peers ack not found.
    						// TODO: BUG maybe? Make sure this does not pick up a link change wipe, that it uses the changign link instead.
    						var soul = end || msg.soul || (tmp = (msg.$$||msg.$)._||'').soul || tmp.link || ((tmp = tmp.put||'')._||'')['#'] || tmp['#'] || (((tmp = msg.put||'') && msg.$$)? tmp['#'] : (tmp['=']||tmp[':']||'')['#']);
    						!end && stun(as, msg.$);
    						if(!soul && !at.link['#']){ // check soul link above us
    							(at.wait || (at.wait = [])).push(function(){ resolve(msg, eve); }); // wait
    							return;
    						}
    						if(!soul){
    							soul = [];
    							(msg.$$||msg.$).back(function(at){
    								if(tmp = at.soul || at.link){ return soul.push(tmp) }
    								soul.push(at.get);
    							});
    							soul = soul.reverse().join('/');
    						}
    						cat.link['#'] = soul;
    						!g && (((as.graph || (as.graph = {}))[soul] = (cat.node || (cat.node = {_:{}})))._['#'] = soul);
    						delete as.wait[id];
    						cat.wait && setTimeout.each(cat.wait, function(cb){ cb && cb(); });
    						as.ran(as);
    					}					// ---------------
    				}
    				if(!to.length){ return as.ran(as) }
    				as.turn(walk);
    			}());
    			return gun;
    		};

    		function stun(as, id){
    			if(!id){ return } id = (id._||'').id||id;
    			var run = as.root.stun || (as.root.stun = {on: Gun.on}), test = {}, tmp;
    			as.stun || (as.stun = run.on('stun', function(){ }));
    			if(tmp = run.on(''+id)){ tmp.the.last.next(test); }
    			if(test.run >= as.run){ return }
    			run.on(''+id, function(test){
    				if(as.stun.end){
    					this.off();
    					this.to.next(test);
    					return;
    				}
    				test.run = test.run || as.run;
    				test.stun = test.stun || as.stun; return;
    			});
    		}

    		function ran(as){
    			if(as.err){ ran.end(as.stun, as.root); return } // move log handle here.
    			if(as.todo.length || as.end || !Object.empty(as.wait)){ return } as.end = 1;
    			var cat = (as.$.back(-1)._), root = cat.root, ask = cat.ask(function(ack){
    				root.on('ack', ack);
    				if(ack.err){ Gun.log(ack); }
    				if(++acks > (as.acks || 0)){ this.off(); } // Adjustable ACKs! Only 1 by default.
    				if(!as.ack){ return }
    				as.ack(ack, this);
    			}, as.opt), acks = 0, stun = as.stun, tmp;
    			(tmp = function(){ // this is not official yet, but quick solution to hack in for now.
    				if(!stun){ return }
    				ran.end(stun, root);
    				setTimeout.each(Object.keys(stun = stun.add||''), function(cb){ if(cb = stun[cb]){cb();} }); // resume the stunned reads // Any perf reasons to CPU schedule this .keys( ?
    			}).hatch = tmp; // this is not official yet ^
    			//console.log(1, "PUT", as.run, as.graph);
    			(as.via._).on('out', {put: as.out = as.graph, opt: as.opt, '#': ask, _: tmp});
    		} ran.end = function(stun,root){
    			stun.end = noop; // like with the earlier id, cheaper to make this flag a function so below callbacks do not have to do an extra type check.
    			if(stun.the.to === stun && stun === stun.the.last){ delete root.stun; }
    			stun.off();
    		};

    		function get(as){
    			var at = as.via._, tmp;
    			as.via = as.via.back(function(at){
    				if(at.soul || !at.get){ return at.$ }
    				tmp = as.data; (as.data = {})[at.get] = tmp;
    			});
    			if(!as.via || !as.via._.soul){
    				as.via = at.root.$.get(((as.data||'')._||'')['#'] || at.$.back('opt.uuid')());
    			}
    			as.via.put(as.data, as.ack, as);
    			

    			return;
    		}

    		var u, noop = function(){}, turn = setTimeout.turn, valid = Gun.valid, state_ify = Gun.state.ify;
    	})(USE, './put');
    USE(function(module){
    		var Gun = USE('./root');
    		USE('./chain');
    		USE('./back');
    		USE('./put');
    		USE('./get');
    		module.exports = Gun;
    	})(USE, './index');
    USE(function(module){
    		var Gun = USE('./index');
    		Gun.chain.on = function(tag, arg, eas, as){ // don't rewrite!
    			var gun = this, cat = gun._; cat.root; var act;
    			if(typeof tag === 'string'){
    				if(!arg){ return cat.on(tag) }
    				act = cat.on(tag, arg, eas || cat, as);
    				if(eas && eas.$){
    					(eas.subs || (eas.subs = [])).push(act);
    				}
    				return gun;
    			}
    			var opt = arg;
    			(opt = (true === opt)? {change: true} : opt || {}).not = 1; opt.on = 1;
    			gun.get(tag, opt);
    			/*gun.get(function on(data,key,msg,eve){ var $ = this;
    				if(tmp = root.hatch){ // quick hack!
    					if(wait[$._.id]){ return } wait[$._.id] = 1;
    					tmp.push(function(){on.call($, data,key,msg,eve)});
    					return;
    				}; wait = {}; // end quick hack.
    				tag.call($, data,key,msg,eve);
    			}, opt); // TODO: PERF! Event listener leak!!!?*/
    			/*
    			function one(msg, eve){
    				if(one.stun){ return }
    				var at = msg.$._, data = at.put, tmp;
    				if(tmp = at.link){ data = root.$.get(tmp)._.put }
    				if(opt.not===u && u === data){ return }
    				if(opt.stun===u && (tmp = root.stun) && (tmp = tmp[at.id] || tmp[at.back.id]) && !tmp.end){ // Remember! If you port this into `.get(cb` make sure you allow stun:0 skip option for `.put(`.
    					tmp[id] = function(){one(msg,eve)};
    					return;
    				}
    				//tmp = one.wait || (one.wait = {}); console.log(tmp[at.id] === ''); if(tmp[at.id] !== ''){ tmp[at.id] = tmp[at.id] || setTimeout(function(){tmp[at.id]='';one(msg,eve)},1); return } delete tmp[at.id];
    				// call:
    				if(opt.as){
    					opt.ok.call(opt.as, msg, eve || one);
    				} else {
    					opt.ok.call(at.$, data, msg.get || at.get, msg, eve || one);
    				}
    			};
    			one.at = cat;
    			(cat.act||(cat.act={}))[id = String.random(7)] = one;
    			one.off = function(){ one.stun = 1; if(!cat.act){ return } delete cat.act[id] }
    			cat.on('out', {get: {}});*/
    			return gun;
    		};
    		// Rules:
    		// 1. If cached, should be fast, but not read while write.
    		// 2. Should not retrigger other listeners, should get triggered even if nothing found.
    		// 3. If the same callback passed to many different once chains, each should resolve - an unsubscribe from the same callback should not effect the state of the other resolving chains, if you do want to cancel them all early you should mutate the callback itself with a flag & check for it at top of callback
    		Gun.chain.once = function(cb, opt){ opt = opt || {}; // avoid rewriting
    			if(!cb){ return none(this) }
    			var gun = this, cat = gun._, root = cat.root; cat.put; var id = String.random(7), tmp;
    			gun.get(function(data,key,msg,eve){
    				var $ = this, at = $._, one = (at.one||(at.one={}));
    				if(eve.stun){ return } if('' === one[id]){ return }
    				if(true === (tmp = Gun.valid(data))){ once(); return }
    				if('string' == typeof tmp){ return } // TODO: BUG? Will this always load?
    				clearTimeout((cat.one||'')[id]); // clear "not found" since they only get set on cat.
    				clearTimeout(one[id]); one[id] = setTimeout(once, opt.wait||99); // TODO: Bug? This doesn't handle plural chains.
    				function once(){
    					if(!at.has && !at.soul){ at = {put: data, get: key}; } // handles non-core messages.
    					if(u === (tmp = at.put)){ tmp = ((msg.$$||'')._||'').put; }
    					if('string' == typeof Gun.valid(tmp)){ tmp = root.$.get(tmp)._.put; if(tmp === u){return} }
    					if(eve.stun){ return } if('' === one[id]){ return } one[id] = '';
    					if(cat.soul || cat.has){ eve.off(); } // TODO: Plural chains? // else { ?.off() } // better than one check?
    					cb.call($, tmp, at.get);
    				}			}, {on: 1});
    			return gun;
    		};
    		function none(gun,opt,chain){
    			Gun.log.once("valonce", "Chainable val is experimental, its behavior and API may change moving forward. Please play with it and report bugs and ideas on how to improve it.");
    			(chain = gun.chain())._.nix = gun.once(function(data, key){ chain._.on('in', this._); });
    			chain._.lex = gun._.lex; // TODO: Better approach in future? This is quick for now.
    			return chain;
    		}

    		Gun.chain.off = function(){
    			// make off more aggressive. Warning, it might backfire!
    			var gun = this, at = gun._, tmp;
    			var cat = at.back;
    			if(!cat){ return }
    			at.ack = 0; // so can resubscribe.
    			if(tmp = cat.next){
    				if(tmp[at.get]){
    					delete tmp[at.get];
    				}
    			}
    			// TODO: delete cat.one[map.id]?
    			if(tmp = cat.ask){
    				delete tmp[at.get];
    			}
    			if(tmp = cat.put){
    				delete tmp[at.get];
    			}
    			if(tmp = at.soul){
    				delete cat.root.graph[tmp];
    			}
    			if(tmp = at.map){
    				Object.keys(tmp).forEach(function(i,at){ at = tmp[i]; //obj_map(tmp, function(at){
    					if(at.link){
    						cat.root.$.get(at.link).off();
    					}
    				});
    			}
    			if(tmp = at.next){
    				Object.keys(tmp).forEach(function(i,neat){ neat = tmp[i]; //obj_map(tmp, function(neat){
    					neat.$.off();
    				});
    			}
    			at.on('off', {});
    			return gun;
    		};
    		var u;
    	})(USE, './on');
    USE(function(module){
    		var Gun = USE('./index'), next = Gun.chain.get.next;
    		Gun.chain.get.next = function(gun, lex){ var tmp;
    			if(!Object.plain(lex)){ return (next||noop)(gun, lex) }
    			if(tmp = ((tmp = lex['#'])||'')['='] || tmp){ return gun.get(tmp) }
    			(tmp = gun.chain()._).lex = lex; // LEX!
    			gun.on('in', function(eve){
    				if(String.match(eve.get|| (eve.put||'')['.'], lex['.'] || lex['#'] || lex)){
    					tmp.on('in', eve);
    				}
    				this.to.next(eve);
    			});
    			return tmp.$;
    		};
    		Gun.chain.map = function(cb, opt, t){
    			var gun = this, cat = gun._, lex, chain;
    			if(Object.plain(cb)){ lex = cb['.']? cb : {'.': cb}; cb = u; }
    			if(!cb){
    				if(chain = cat.each){ return chain }
    				(cat.each = chain = gun.chain())._.lex = lex || chain._.lex || cat.lex;
    				chain._.nix = gun.back('nix');
    				gun.on('in', map, chain._);
    				return chain;
    			}
    			Gun.log.once("mapfn", "Map functions are experimental, their behavior and API may change moving forward. Please play with it and report bugs and ideas on how to improve it.");
    			chain = gun.chain();
    			gun.map().on(function(data, key, msg, eve){
    				var next = (cb||noop).call(this, data, key, msg, eve);
    				if(u === next){ return }
    				if(data === next){ return chain._.on('in', msg) }
    				if(Gun.is(next)){ return chain._.on('in', next._) }
    				var tmp = {}; Object.keys(msg.put).forEach(function(k){ tmp[k] = msg.put[k]; }, tmp); tmp['='] = next; 
    				chain._.on('in', {get: key, put: tmp});
    			});
    			return chain;
    		};
    		function map(msg){ this.to.next(msg);
    			var cat = this.as, gun = msg.$, at = gun._, put = msg.put, tmp;
    			if(!at.soul && !msg.$$){ return } // this line took hundreds of tries to figure out. It only works if core checks to filter out above chains during link tho. This says "only bother to map on a node" for this layer of the chain. If something is not a node, map should not work.
    			if((tmp = cat.lex) && !String.match(msg.get|| (put||'')['.'], tmp['.'] || tmp['#'] || tmp)){ return }
    			Gun.on.link(msg, cat);
    		}
    		var noop = function(){}, u;
    	})(USE, './map');
    USE(function(module){
    		var Gun = USE('./index');
    		Gun.chain.set = function(item, cb, opt){
    			var gun = this, root = gun.back(-1), soul, tmp;
    			cb = cb || function(){};
    			opt = opt || {}; opt.item = opt.item || item;
    			if(soul = ((item||'')._||'')['#']){ (item = {})['#'] = soul; } // check if node, make link.
    			if('string' == typeof (tmp = Gun.valid(item))){ return gun.get(soul = tmp).put(item, cb, opt) } // check if link
    			if(!Gun.is(item)){
    				if(Object.plain(item)){
    					item = root.get(soul = gun.back('opt.uuid')()).put(item);
    				}
    				return gun.get(soul || root.back('opt.uuid')(7)).put(item, cb, opt);
    			}
    			gun.put(function(go){
    				item.get(function(soul, o, msg){ // TODO: BUG! We no longer have this option? & go error not handled?
    					if(!soul){ return cb.call(gun, {err: Gun.log('Only a node can be linked! Not "' + msg.put + '"!')}) }
    					(tmp = {})[soul] = {'#': soul}; go(tmp);
    				},true);
    			});
    			return item;
    		};
    	})(USE, './set');
    USE(function(module){
    		USE('./shim');

    		function Mesh(root){
    			var mesh = function(){};
    			var opt = root.opt || {};
    			opt.log = opt.log || console.log;
    			opt.gap = opt.gap || opt.wait || 0;
    			opt.max = opt.max || (opt.memory? (opt.memory * 999 * 999) : 300000000) * 0.3;
    			opt.pack = opt.pack || (opt.max * 0.01 * 0.01);
    			opt.puff = opt.puff || 9; // IDEA: do a start/end benchmark, divide ops/result.
    			var puff = setTimeout.turn || setTimeout;
    			var parse = JSON.parseAsync || function(t,cb,r){ var u; try{ cb(u, JSON.parse(t,r)); }catch(e){ cb(e); } };
    			var json = JSON.stringifyAsync || function(v,cb,r,s){ var u; try{ cb(u, JSON.stringify(v,r,s)); }catch(e){ cb(e); } };

    			var dup = root.dup, dup_check = dup.check, dup_track = dup.track;

    			var hear = mesh.hear = function(raw, peer){
    				if(!raw){ return }
    				if(opt.max <= raw.length){ return mesh.say({dam: '!', err: "Message too big!"}, peer) }
    				if(mesh === this){
    					/*if('string' == typeof raw){ try{
    						var stat = console.STAT || {};
    						//console.log('HEAR:', peer.id, (raw||'').slice(0,250), ((raw||'').length / 1024 / 1024).toFixed(4));
    						
    						//console.log(setTimeout.turn.s.length, 'stacks', parseFloat((-(LT - (LT = +new Date))/1000).toFixed(3)), 'sec', parseFloat(((LT-ST)/1000 / 60).toFixed(1)), 'up', stat.peers||0, 'peers', stat.has||0, 'has', stat.memhused||0, stat.memused||0, stat.memax||0, 'heap mem max');
    					}catch(e){ console.log('DBG err', e) }}*/
    					hear.d += raw.length||0 ; ++hear.c; } // STATS!
    				var S = peer.SH = +new Date;
    				var tmp = raw[0], msg;
    				//raw && raw.slice && console.log("hear:", ((peer.wire||'').headers||'').origin, raw.length, raw.slice && raw.slice(0,50)); //tc-iamunique-tc-package-ds1
    				if('[' === tmp){
    					parse(raw, function(err, msg){
    						if(err || !msg){ return mesh.say({dam: '!', err: "DAM JSON parse error."}, peer) }
    						console.STAT && console.STAT(+new Date, msg.length, '# on hear batch');
    						var P = opt.puff;
    						(function go(){
    							var S = +new Date;
    							var i = 0, m; while(i < P && (m = msg[i++])){ hear(m, peer); }
    							msg = msg.slice(i); // slicing after is faster than shifting during.
    							console.STAT && console.STAT(S, +new Date - S, 'hear loop');
    							flush(peer); // force send all synchronously batched acks.
    							if(!msg.length){ return }
    							puff(go, 0);
    						}());
    					});
    					raw = ''; // 
    					return;
    				}
    				if('{' === tmp || ((raw['#'] || Object.plain(raw)) && (msg = raw))){
    					if(msg){ return hear.one(msg, peer, S) }
    					parse(raw, function(err, msg){
    						if(err || !msg){ return mesh.say({dam: '!', err: "DAM JSON parse error."}, peer) }
    						hear.one(msg, peer, S);
    					});
    					return;
    				}
    			};
    			hear.one = function(msg, peer, S){ // S here is temporary! Undo.
    				var id, hash, tmp, ash, DBG;
    				if(msg.DBG){ msg.DBG = DBG = {DBG: msg.DBG}; }
    				DBG && (DBG.h = S);
    				DBG && (DBG.hp = +new Date);
    				if(!(id = msg['#'])){ id = msg['#'] = String.random(9); }
    				if(tmp = dup_check(id)){ return }
    				// DAM logic:
    				if(!(hash = msg['##']) && false && u !== msg.put); // disable hashing for now // TODO: impose warning/penalty instead (?)
    				if(hash && (tmp = msg['@'] || (msg.get && id)) && dup.check(ash = tmp+hash)){ return } // Imagine A <-> B <=> (C & D), C & D reply with same ACK but have different IDs, B can use hash to dedup. Or if a GET has a hash already, we shouldn't ACK if same.
    				(msg._ = function(){}).via = mesh.leap = peer;
    				if((tmp = msg['><']) && 'string' == typeof tmp){ tmp.slice(0,99).split(',').forEach(function(k){ this[k] = 1; }, (msg._).yo = {}); } // Peers already sent to, do not resend.
    				// DAM ^
    				if(tmp = msg.dam){
    					if(tmp = mesh.hear[tmp]){
    						tmp(msg, peer, root);
    					}
    					dup_track(id);
    					return;
    				}
    				var S = +new Date;
    				DBG && (DBG.is = S); peer.SI = id;
    				root.on('in', mesh.last = msg);
    				//ECHO = msg.put || ECHO; !(msg.ok !== -3740) && mesh.say({ok: -3740, put: ECHO, '@': msg['#']}, peer);
    				DBG && (DBG.hd = +new Date);
    				console.STAT && console.STAT(S, +new Date - S, msg.get? 'msg get' : msg.put? 'msg put' : 'msg');
    				(tmp = dup_track(id)).via = peer; // don't dedup message ID till after, cause GUN has internal dedup check.
    				if(msg.get){ tmp.it = msg; }
    				if(ash){ dup_track(ash); } //dup.track(tmp+hash, true).it = it(msg);
    				mesh.leap = mesh.last = null; // warning! mesh.leap could be buggy.
    			};
    			hear.c = hear.d = 0;
    (function(){
    				var SMIA = 0;
    				var loop;
    				mesh.hash = function(msg, peer){ var h, s, t;
    					var S = +new Date;
    					json(msg.put, function hash(err, text){
    						var ss = (s || (s = t = text||'')).slice(0, 32768); // 1024 * 32
    					  h = String.hash(ss, h); s = s.slice(32768);
    					  if(s){ puff(hash, 0); return }
    						console.STAT && console.STAT(S, +new Date - S, 'say json+hash');
    					  msg._.$put = t;
    					  msg['##'] = h;
    					  say(msg, peer);
    					  delete msg._.$put;
    					}, sort);
    				};
    				function sort(k, v){ var tmp;
    					if(!(v instanceof Object)){ return v }
    					Object.keys(v).sort().forEach(sorta, {to: tmp = {}, on: v});
    					return tmp;
    				} function sorta(k){ this.to[k] = this.on[k]; }

    				var say = mesh.say = function(msg, peer){ var tmp;
    					if((tmp = this) && (tmp = tmp.to) && tmp.next){ tmp.next(msg); } // compatible with middleware adapters.
    					if(!msg){ return false }
    					var id, raw, ack = msg['@'];
    //if(opt.super && (!ack || !msg.put)){ return } // TODO: MANHATTAN STUB //OBVIOUSLY BUG! But squelch relay. // :( get only is 100%+ CPU usage :(
    					var meta = msg._||(msg._=function(){});
    					var DBG = msg.DBG, S = +new Date; meta.y = meta.y || S; if(!peer){ DBG && (DBG.y = S); }
    					if(!(id = msg['#'])){ id = msg['#'] = String.random(9); }
    					!loop && dup_track(id);//.it = it(msg); // track for 9 seconds, default. Earth<->Mars would need more! // always track, maybe move this to the 'after' logic if we split function.
    					if(msg.put && (msg.err || (dup.s[id]||'').err)){ return false } // TODO: in theory we should not be able to stun a message, but for now going to check if it can help network performance preventing invalid data to relay.
    					if(!(msg['##']) && u !== msg.put && !meta.via && ack){ mesh.hash(msg, peer); return } // TODO: Should broadcasts be hashed?
    					if(!peer && ack){ peer = ((tmp = dup.s[ack]) && (tmp.via || ((tmp = tmp.it) && (tmp = tmp._) && tmp.via))) || ((tmp = mesh.last) && ack === tmp['#'] && mesh.leap); } // warning! mesh.leap could be buggy! mesh last check reduces this.
    					if(!peer && ack){ // still no peer, then ack daisy chain lost.
    						if(dup.s[ack]){ return } // in dups but no peer hints that this was ack to self, ignore.
    						console.STAT && console.STAT(+new Date, ++SMIA, 'total no peer to ack to');
    						return false;
    					} // TODO: Temporary? If ack via trace has been lost, acks will go to all peers, which trashes browser bandwidth. Not relaying the ack will force sender to ask for ack again. Note, this is technically wrong for mesh behavior.
    					if(!peer && mesh.way){ return mesh.way(msg) }
    					DBG && (DBG.yh = +new Date);
    					if(!(raw = meta.raw)){ mesh.raw(msg, peer); return }
    					DBG && (DBG.yr = +new Date);
    					if(!peer || !peer.id){
    						if(!Object.plain(peer || opt.peers)){ return false }
    						var S = +new Date;
    						opt.puff; var ps = opt.peers, pl = Object.keys(peer || opt.peers || {}); // TODO: .keys( is slow
    						console.STAT && console.STAT(S, +new Date - S, 'peer keys');
    (function go(){
    							var S = +new Date;
    							//Type.obj.map(peer || opt.peers, each); // in case peer is a peer list.
    							loop = 1; var wr = meta.raw; meta.raw = raw; // quick perf hack
    							var i = 0, p; while(i < 9 && (p = (pl||'')[i++])){
    								if(!(p = ps[p])){ continue }
    								say(msg, p);
    							}
    							meta.raw = wr; loop = 0;
    							pl = pl.slice(i); // slicing after is faster than shifting during.
    							console.STAT && console.STAT(S, +new Date - S, 'say loop');
    							if(!pl.length){ return }
    							puff(go, 0);
    							ack && dup_track(ack); // keep for later
    						}());
    						return;
    					}
    					// TODO: PERF: consider splitting function here, so say loops do less work.
    					if(!peer.wire && mesh.wire){ mesh.wire(peer); }
    					if(id === peer.last){ return } peer.last = id;  // was it just sent?
    					if(peer === meta.via){ return false } // don't send back to self.
    					if((tmp = meta.yo) && (tmp[peer.url] || tmp[peer.pid] || tmp[peer.id]) /*&& !o*/){ return false }
    					console.STAT && console.STAT(S, ((DBG||meta).yp = +new Date) - (meta.y || S), 'say prep');
    					!loop && ack && dup_track(ack); // streaming long responses needs to keep alive the ack.
    					if(peer.batch){
    						peer.tail = (tmp = peer.tail || 0) + raw.length;
    						if(peer.tail <= opt.pack){
    							peer.batch += (tmp?',':'')+raw;
    							return;
    						}
    						flush(peer);
    					}
    					peer.batch = '['; // Prevents double JSON!
    					var ST = +new Date;
    					setTimeout(function(){
    						console.STAT && console.STAT(ST, +new Date - ST, '0ms TO');
    						flush(peer);
    					}, opt.gap); // TODO: queuing/batching might be bad for low-latency video game performance! Allow opt out?
    					send(raw, peer);
    					console.STAT && (ack === peer.SI) && console.STAT(S, +new Date - peer.SH, 'say ack');
    				};
    				mesh.say.c = mesh.say.d = 0;
    				// TODO: this caused a out-of-memory crash!
    				mesh.raw = function(msg, peer){ // TODO: Clean this up / delete it / move logic out!
    					if(!msg){ return '' }
    					var meta = (msg._) || {}, put, tmp;
    					if(tmp = meta.raw){ return tmp }
    					if('string' == typeof msg){ return msg }
    					var hash = msg['##'], ack = msg['@'];
    					if(hash && ack){
    						if(!meta.via && dup_check(ack+hash)){ return false } // for our own out messages, memory & storage may ack the same thing, so dedup that. Tho if via another peer, we already tracked it upon hearing, so this will always trigger false positives, so don't do that!
    						if((tmp = (dup.s[ack]||'').it) || ((tmp = mesh.last) && ack === tmp['#'])){
    							if(hash === tmp['##']){ return false } // if ask has a matching hash, acking is optional.
    							if(!tmp['##']){ tmp['##'] = hash; } // if none, add our hash to ask so anyone we relay to can dedup. // NOTE: May only check against 1st ack chunk, 2nd+ won't know and still stream back to relaying peers which may then dedup. Any way to fix this wasted bandwidth? I guess force rate limiting breaking change, that asking peer has to ask for next lexical chunk.
    						}
    					}
    					if(!msg.dam){
    						var i = 0, to = []; tmp = opt.peers;
    						for(var k in tmp){ var p = tmp[k]; // TODO: Make it up peers instead!
    							to.push(p.url || p.pid || p.id);
    							if(++i > 6){ break }
    						}
    						if(i > 1){ msg['><'] = to.join(); } // TODO: BUG! This gets set regardless of peers sent to! Detect?
    					}
    					if(put = meta.$put){
    						tmp = {}; Object.keys(msg).forEach(function(k){ tmp[k] = msg[k]; });
    						tmp.put = ':])([:';
    						json(tmp, function(err, raw){
    							if(err){ return } // TODO: Handle!!
    							var S = +new Date;
    							tmp = raw.indexOf('"put":":])([:"');
    							res(u, raw = raw.slice(0, tmp+6) + put + raw.slice(tmp + 14));
    							console.STAT && console.STAT(S, +new Date - S, 'say slice');
    						});
    						return;
    					}
    					json(msg, res);
    					function res(err, raw){
    						if(err){ return } // TODO: Handle!!
    						meta.raw = raw; //if(meta && (raw||'').length < (999 * 99)){ meta.raw = raw } // HNPERF: If string too big, don't keep in memory.
    						say(msg, peer);
    					}
    				};
    			}());

    			function flush(peer){
    				var tmp = peer.batch, t = 'string' == typeof tmp;
    				if(t){ tmp += ']'; }// TODO: Prevent double JSON!
    				peer.batch = peer.tail = null;
    				if(!tmp){ return }
    				if(t? 3 > tmp.length : !tmp.length){ return } // TODO: ^
    				if(!t){try{tmp = (1 === tmp.length? tmp[0] : JSON.stringify(tmp));
    				}catch(e){return opt.log('DAM JSON stringify error', e)}}
    				if(!tmp){ return }
    				send(tmp, peer);
    			}
    			// for now - find better place later.
    			function send(raw, peer){ try{
    				//console.log('SAY:', peer.id, (raw||'').slice(0,250), ((raw||'').length / 1024 / 1024).toFixed(4));
    				var wire = peer.wire;
    				if(peer.say){
    					peer.say(raw);
    				} else
    				if(wire.send){
    					wire.send(raw);
    				}
    				mesh.say.d += raw.length||0; ++mesh.say.c; // STATS!
    			}catch(e){
    				(peer.queue = peer.queue || []).push(raw);
    			}}

    			mesh.hi = function(peer){
    				var tmp = peer.wire || {};
    				if(peer.id){
    					opt.peers[peer.url || peer.id] = peer;
    				} else {
    					tmp = peer.id = peer.id || String.random(9);
    					mesh.say({dam: '?', pid: root.opt.pid}, opt.peers[tmp] = peer);
    					delete dup.s[peer.last]; // IMPORTANT: see https://gun.eco/docs/DAM#self
    				}
    				peer.met = peer.met || +(new Date);
    				if(!tmp.hied){ root.on(tmp.hied = 'hi', peer); }
    				// @rogowski I need this here by default for now to fix go1dfish's bug
    				tmp = peer.queue; peer.queue = [];
    				setTimeout.each(tmp||[],function(msg){
    					send(msg, peer);
    				},0,9);
    				//Type.obj.native && Type.obj.native(); // dirty place to check if other JS polluted.
    			};
    			mesh.bye = function(peer){
    				root.on('bye', peer);
    				var tmp = +(new Date); tmp = (tmp - (peer.met||tmp));
    				mesh.bye.time = ((mesh.bye.time || tmp) + tmp) / 2;
    			};
    			mesh.hear['!'] = function(msg, peer){ opt.log('Error:', msg.err); };
    			mesh.hear['?'] = function(msg, peer){
    				if(msg.pid){
    					if(!peer.pid){ peer.pid = msg.pid; }
    					if(msg['@']){ return }
    				}
    				mesh.say({dam: '?', pid: opt.pid, '@': msg['#']}, peer);
    				delete dup.s[peer.last]; // IMPORTANT: see https://gun.eco/docs/DAM#self
    			};

    			root.on('create', function(root){
    				root.opt.pid = root.opt.pid || String.random(9);
    				this.to.next(root);
    				root.on('out', mesh.say);
    			});

    			root.on('bye', function(peer, tmp){
    				peer = opt.peers[peer.id || peer] || peer;
    				this.to.next(peer);
    				peer.bye? peer.bye() : (tmp = peer.wire) && tmp.close && tmp.close();
    				delete opt.peers[peer.id];
    				peer.wire = null;
    			});

    			var gets = {};
    			root.on('bye', function(peer, tmp){ this.to.next(peer);
    				if(tmp = console.STAT){ tmp.peers = (tmp.peers || 0) - 1; }
    				if(!(tmp = peer.url)){ return } gets[tmp] = true;
    				setTimeout(function(){ delete gets[tmp]; },opt.lack || 9000);
    			});
    			root.on('hi', function(peer, tmp){ this.to.next(peer);
    				if(tmp = console.STAT){ tmp.peers = (tmp.peers || 0) + 1; }
    				if(!(tmp = peer.url) || !gets[tmp]){ return } delete gets[tmp];
    				if(opt.super){ return } // temporary (?) until we have better fix/solution?
    				setTimeout.each(Object.keys(root.next), function(soul){ root.next[soul]; // TODO: .keys( is slow
    					tmp = {}; tmp[soul] = root.graph[soul]; tmp = String.hash(tmp); // TODO: BUG! This is broken.
    					mesh.say({'##': tmp, get: {'#': soul}}, peer);
    				});
    			});

    			return mesh;
    		}
    	  var u;

    	  try{ module.exports = Mesh; }catch(e){}

    	})(USE, './mesh');
    USE(function(module){
    		var Gun = USE('../index');
    		Gun.Mesh = USE('./mesh');

    		// TODO: resync upon reconnect online/offline
    		//window.ononline = window.onoffline = function(){ console.log('online?', navigator.onLine) }

    		Gun.on('opt', function(root){
    			this.to.next(root);
    			if(root.once){ return }
    			var opt = root.opt;
    			if(false === opt.WebSocket){ return }

    			var env = Gun.window || {};
    			var websocket = opt.WebSocket || env.WebSocket || env.webkitWebSocket || env.mozWebSocket;
    			if(!websocket){ return }
    			opt.WebSocket = websocket;

    			var mesh = opt.mesh = opt.mesh || Gun.Mesh(root);

    			mesh.wire || opt.wire;
    			mesh.wire = opt.wire = open;
    			function open(peer){ try{
    				if(!peer || !peer.url){ return wire && wire(peer) }
    				var url = peer.url.replace(/^http/, 'ws');
    				var wire = peer.wire = new opt.WebSocket(url);
    				wire.onclose = function(){
    					opt.mesh.bye(peer);
    					reconnect(peer);
    				};
    				wire.onerror = function(error){
    					reconnect(peer);
    				};
    				wire.onopen = function(){
    					opt.mesh.hi(peer);
    				};
    				wire.onmessage = function(msg){
    					if(!msg){ return }
    					opt.mesh.hear(msg.data || msg, peer);
    				};
    				return wire;
    			}catch(e){}}

    			setTimeout(function(){ !opt.super && root.on('out', {dam:'hi'}); },1); // it can take a while to open a socket, so maybe no longer lazy load for perf reasons?

    			var wait = 2 * 999;
    			function reconnect(peer){
    				clearTimeout(peer.defer);
    				if(doc && peer.retry <= 0){ return }
    				peer.retry = (peer.retry || opt.retry+1 || 60) - ((-peer.tried + (peer.tried = +new Date) < wait*4)?1:0);
    				peer.defer = setTimeout(function to(){
    					if(doc && doc.hidden){ return setTimeout(to,wait) }
    					open(peer);
    				}, wait);
    			}
    			var doc = (''+u !== typeof document) && document;
    		});
    		var u;
    	})(USE, './websocket');
    USE(function(module){
    		if(typeof Gun === 'undefined'){ return }

    		var noop = function(){}, store;
    		try{store = (Gun.window||noop).localStorage;}catch(e){}
    		if(!store){
    			Gun.log("Warning: No localStorage exists to persist data to!");
    			store = {setItem: function(k,v){this[k]=v;}, removeItem: function(k){delete this[k];}, getItem: function(k){return this[k]}};
    		}
    		Gun.on('create', function lg(root){
    			this.to.next(root);
    			var opt = root.opt; root.graph; var acks = [], disk, to;
    			if(false === opt.localStorage){ return }
    			opt.prefix = opt.file || 'gun/';
    			try{ disk = lg[opt.prefix] = lg[opt.prefix] || JSON.parse(store.getItem(opt.prefix)) || {}; // TODO: Perf! This will block, should we care, since limited to 5MB anyways?
    			}catch(e){ disk = lg[opt.prefix] = {}; }

    			root.on('get', function(msg){
    				this.to.next(msg);
    				var lex = msg.get, soul, data, tmp, u;
    				if(!lex || !(soul = lex['#'])){ return }
    				data = disk[soul] || u;
    				if(data && (tmp = lex['.']) && !Object.plain(tmp)){ // pluck!
    					data = Gun.state.ify({}, tmp, Gun.state.is(data, tmp), data[tmp], soul);
    				}
    				//if(data){ (tmp = {})[soul] = data } // back into a graph.
    				//setTimeout(function(){
    				Gun.on.get.ack(msg, data); //root.on('in', {'@': msg['#'], put: tmp, lS:1});// || root.$});
    				//}, Math.random() * 10); // FOR TESTING PURPOSES!
    			});

    			root.on('put', function(msg){
    				this.to.next(msg); // remember to call next middleware adapter
    				var put = msg.put, soul = put['#'], key = put['.']; // pull data off wire envelope
    				disk[soul] = Gun.state.ify(disk[soul], key, put['>'], put[':'], soul); // merge into disk object
    				if(!msg['@']){ acks.push(msg['#']); } // then ack any non-ack write. // TODO: use batch id.
    				if(to){ return }
    				//flush();return;
    				to = setTimeout(flush, opt.wait || 1); // that gets saved as a whole to disk every 1ms
    			});
    			function flush(){
    				var err, ack = acks; clearTimeout(to); to = false; acks = [];
    				try{store.setItem(opt.prefix, JSON.stringify(disk));
    				}catch(e){
    					Gun.log((err = (e || "localStorage failure")) + " Consider using GUN's IndexedDB plugin for RAD for more storage space, https://gun.eco/docs/RAD#install");
    					root.on('localStorage:error', {err: err, get: opt.prefix, put: disk});
    				}
    				if(!err && !Object.empty(opt.peers)){ return } // only ack if there are no peers. // Switch this to probabilistic mode
    				setTimeout.each(ack, function(id){
    					root.on('in', {'@': id, err: err, ok: 0}); // localStorage isn't reliable, so make its `ok` code be a low number.
    				});
    			}
    		
    		});
    	})(USE, './localStorage');

    }());
    (function(){
    	var u;
    	if(''+u == typeof Gun){ return }
    	var DEP = function(n){ console.log("Warning! Deprecated internal utility will break in next version:", n); };
    	// Generic javascript utilities.
    	var Type = Gun;
    	//Type.fns = Type.fn = {is: function(fn){ return (!!fn && fn instanceof Function) }}
    	Type.fn = Type.fn || {is: function(fn){ DEP('fn'); return (!!fn && 'function' == typeof fn) }};
    	Type.bi = Type.bi || {is: function(b){ DEP('bi');return (b instanceof Boolean || typeof b == 'boolean') }};
    	Type.num = Type.num || {is: function(n){ DEP('num'); return !list_is(n) && ((n - parseFloat(n) + 1) >= 0 || Infinity === n || -Infinity === n) }};
    	Type.text = Type.text || {is: function(t){ DEP('text'); return (typeof t == 'string') }};
    	Type.text.ify = Type.text.ify || function(t){ DEP('text.ify');
    		if(Type.text.is(t)){ return t }
    		if(typeof JSON !== "undefined"){ return JSON.stringify(t) }
    		return (t && t.toString)? t.toString() : t;
    	};
    	Type.text.random = Type.text.random || function(l, c){ DEP('text.random');
    		var s = '';
    		l = l || 24; // you are not going to make a 0 length random number, so no need to check type
    		c = c || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz';
    		while(l > 0){ s += c.charAt(Math.floor(Math.random() * c.length)); l--; }
    		return s;
    	};
    	Type.text.match = Type.text.match || function(t, o){ var tmp, u; DEP('text.match');
    		if('string' !== typeof t){ return false }
    		if('string' == typeof o){ o = {'=': o}; }
    		o = o || {};
    		tmp = (o['='] || o['*'] || o['>'] || o['<']);
    		if(t === tmp){ return true }
    		if(u !== o['=']){ return false }
    		tmp = (o['*'] || o['>'] || o['<']);
    		if(t.slice(0, (tmp||'').length) === tmp){ return true }
    		if(u !== o['*']){ return false }
    		if(u !== o['>'] && u !== o['<']){
    			return (t >= o['>'] && t <= o['<'])? true : false;
    		}
    		if(u !== o['>'] && t >= o['>']){ return true }
    		if(u !== o['<'] && t <= o['<']){ return true }
    		return false;
    	};
    	Type.text.hash = Type.text.hash || function(s, c){ // via SO
    		DEP('text.hash');
    		if(typeof s !== 'string'){ return }
    	  c = c || 0;
    	  if(!s.length){ return c }
    	  for(var i=0,l=s.length,n; i<l; ++i){
    	    n = s.charCodeAt(i);
    	    c = ((c<<5)-c)+n;
    	    c |= 0;
    	  }
    	  return c;
    	};
    	Type.list = Type.list || {is: function(l){ DEP('list'); return (l instanceof Array) }};
    	Type.list.slit = Type.list.slit || Array.prototype.slice;
    	Type.list.sort = Type.list.sort || function(k){ // creates a new sort function based off some key
    		DEP('list.sort');
    		return function(A,B){
    			if(!A || !B){ return 0 } A = A[k]; B = B[k];
    			if(A < B){ return -1 }else if(A > B){ return 1 }
    			else { return 0 }
    		}
    	};
    	Type.list.map = Type.list.map || function(l, c, _){ DEP('list.map'); return obj_map(l, c, _) };
    	Type.list.index = 1; // change this to 0 if you want non-logical, non-mathematical, non-matrix, non-convenient array notation
    	Type.obj = Type.boj || {is: function(o){ DEP('obj'); return o? (o instanceof Object && o.constructor === Object) || Object.prototype.toString.call(o).match(/^\[object (\w+)\]$/)[1] === 'Object' : false }};
    	Type.obj.put = Type.obj.put || function(o, k, v){ DEP('obj.put'); return (o||{})[k] = v, o };
    	Type.obj.has = Type.obj.has || function(o, k){ DEP('obj.has'); return o && Object.prototype.hasOwnProperty.call(o, k) };
    	Type.obj.del = Type.obj.del || function(o, k){ DEP('obj.del'); 
    		if(!o){ return }
    		o[k] = null;
    		delete o[k];
    		return o;
    	};
    	Type.obj.as = Type.obj.as || function(o, k, v, u){ DEP('obj.as'); return o[k] = o[k] || (u === v? {} : v) };
    	Type.obj.ify = Type.obj.ify || function(o){ DEP('obj.ify'); 
    		if(obj_is(o)){ return o }
    		try{o = JSON.parse(o);
    		}catch(e){o={};}		return o;
    	}
    	;(function(){ var u;
    		function map(v,k){
    			if(obj_has(this,k) && u !== this[k]){ return }
    			this[k] = v;
    		}
    		Type.obj.to = Type.obj.to || function(from, to){ DEP('obj.to'); 
    			to = to || {};
    			obj_map(from, map, to);
    			return to;
    		};
    	}());
    	Type.obj.copy = Type.obj.copy || function(o){ DEP('obj.copy'); // because http://web.archive.org/web/20140328224025/http://jsperf.com/cloning-an-object/2
    		return !o? o : JSON.parse(JSON.stringify(o)); // is shockingly faster than anything else, and our data has to be a subset of JSON anyways!
    	}
    	;(function(){
    		function empty(v,i){ var n = this.n, u;
    			if(n && (i === n || (obj_is(n) && obj_has(n, i)))){ return }
    			if(u !== i){ return true }
    		}
    		Type.obj.empty = Type.obj.empty || function(o, n){ DEP('obj.empty'); 
    			if(!o){ return true }
    			return obj_map(o,empty,{n:n})? false : true;
    		};
    	}());
    (function(){
    		function t(k,v){
    			if(2 === arguments.length){
    				t.r = t.r || {};
    				t.r[k] = v;
    				return;
    			} t.r = t.r || [];
    			t.r.push(k);
    		}		var keys = Object.keys, map;
    		Object.keys = Object.keys || function(o){ return map(o, function(v,k,t){t(k);}) };
    		Type.obj.map = map = Type.obj.map || function(l, c, _){ DEP('obj.map'); 
    			var u, i = 0, x, r, ll, lle, f = 'function' == typeof c;
    			t.r = u;
    			if(keys && obj_is(l)){
    				ll = keys(l); lle = true;
    			}
    			_ = _ || {};
    			if(list_is(l) || ll){
    				x = (ll || l).length;
    				for(;i < x; i++){
    					var ii = (i + Type.list.index);
    					if(f){
    						r = lle? c.call(_, l[ll[i]], ll[i], t) : c.call(_, l[i], ii, t);
    						if(r !== u){ return r }
    					} else {
    						//if(Type.test.is(c,l[i])){ return ii } // should implement deep equality testing!
    						if(c === l[lle? ll[i] : i]){ return ll? ll[i] : ii } // use this for now
    					}
    				}
    			} else {
    				for(i in l){
    					if(f){
    						if(obj_has(l,i)){
    							r = _? c.call(_, l[i], i, t) : c(l[i], i, t);
    							if(r !== u){ return r }
    						}
    					} else {
    						//if(a.test.is(c,l[i])){ return i } // should implement deep equality testing!
    						if(c === l[i]){ return i } // use this for now
    					}
    				}
    			}
    			return f? t.r : Type.list.index? 0 : -1;
    		};
    	}());
    	Type.time = Type.time || {};
    	Type.time.is = Type.time.is || function(t){ DEP('time'); return t? t instanceof Date : (+new Date().getTime()) };

    	var fn_is = Type.fn.is;
    	var list_is = Type.list.is;
    	var obj = Type.obj, obj_is = obj.is, obj_has = obj.has, obj_map = obj.map;

    	var Val = {};
    	Val.is = function(v){ DEP('val.is'); // Valid values are a subset of JSON: null, binary, number (!Infinity), text, or a soul relation. Arrays need special algorithms to handle concurrency, so they are not supported directly. Use an extension that supports them if needed but research their problems first.
    		if(v === u){ return false }
    		if(v === null){ return true } // "deletes", nulling out keys.
    		if(v === Infinity){ return false } // we want this to be, but JSON does not support it, sad face.
    		if(text_is(v) // by "text" we mean strings.
    		|| bi_is(v) // by "binary" we mean boolean.
    		|| num_is(v)){ // by "number" we mean integers or decimals.
    			return true; // simple values are valid.
    		}
    		return Val.link.is(v) || false; // is the value a soul relation? Then it is valid and return it. If not, everything else remaining is an invalid data type. Custom extensions can be built on top of these primitives to support other types.
    	};
    	Val.link = Val.rel = {_: '#'};
    (function(){
    		Val.link.is = function(v){ DEP('val.link.is'); // this defines whether an object is a soul relation or not, they look like this: {'#': 'UUID'}
    			if(v && v[rel_] && !v._ && obj_is(v)){ // must be an object.
    				var o = {};
    				obj_map(v, map, o);
    				if(o.id){ // a valid id was found.
    					return o.id; // yay! Return it.
    				}
    			}
    			return false; // the value was not a valid soul relation.
    		};
    		function map(s, k){ var o = this; // map over the object...
    			if(o.id){ return o.id = false } // if ID is already defined AND we're still looping through the object, it is considered invalid.
    			if(k == rel_ && text_is(s)){ // the key should be '#' and have a text value.
    				o.id = s; // we found the soul!
    			} else {
    				return o.id = false; // if there exists anything else on the object that isn't the soul, then it is considered invalid.
    			}
    		}
    	}());
    	Val.link.ify = function(t){ DEP('val.link.ify'); return obj_put({}, rel_, t) }; // convert a soul into a relation and return it.
    	Type.obj.has._ = '.';
    	var rel_ = Val.link._, u;
    	var bi_is = Type.bi.is;
    	var num_is = Type.num.is;
    	var text_is = Type.text.is;
    	var obj = Type.obj, obj_is = obj.is, obj_put = obj.put, obj_map = obj.map;

    	Type.val = Type.val || Val;

    	var Node = {_: '_'};
    	Node.soul = function(n, o){ DEP('node.soul'); return (n && n._ && n._[o || soul_]) }; // convenience function to check to see if there is a soul on a node and return it.
    	Node.soul.ify = function(n, o){ DEP('node.soul.ify'); // put a soul on an object.
    		o = (typeof o === 'string')? {soul: o} : o || {};
    		n = n || {}; // make sure it exists.
    		n._ = n._ || {}; // make sure meta exists.
    		n._[soul_] = o.soul || n._[soul_] || text_random(); // put the soul on it.
    		return n;
    	};
    	Node.soul._ = Val.link._;
    (function(){
    		Node.is = function(n, cb, as){ DEP('node.is'); var s; // checks to see if an object is a valid node.
    			if(!obj_is(n)){ return false } // must be an object.
    			if(s = Node.soul(n)){ // must have a soul on it.
    				return !obj_map(n, map, {as:as,cb:cb,s:s,n:n});
    			}
    			return false; // nope! This was not a valid node.
    		};
    		function map(v, k){ // we invert this because the way we check for this is via a negation.
    			if(k === Node._){ return } // skip over the metadata.
    			if(!Val.is(v)){ return true } // it is true that this is an invalid node.
    			if(this.cb){ this.cb.call(this.as, v, k, this.n, this.s); } // optionally callback each key/value.
    		}
    	}());
    (function(){
    		Node.ify = function(obj, o, as){ DEP('node.ify'); // returns a node from a shallow object.
    			if(!o){ o = {}; }
    			else if(typeof o === 'string'){ o = {soul: o}; }
    			else if('function' == typeof o){ o = {map: o}; }
    			if(o.map){ o.node = o.map.call(as, obj, u, o.node || {}); }
    			if(o.node = Node.soul.ify(o.node || {}, o)){
    				obj_map(obj, map, {o:o,as:as});
    			}
    			return o.node; // This will only be a valid node if the object wasn't already deep!
    		};
    		function map(v, k){ var o = this.o, tmp, u; // iterate over each key/value.
    			if(o.map){
    				tmp = o.map.call(this.as, v, ''+k, o.node);
    				if(u === tmp){
    					obj_del(o.node, k);
    				} else
    				if(o.node){ o.node[k] = tmp; }
    				return;
    			}
    			if(Val.is(v)){
    				o.node[k] = v;
    			}
    		}
    	}());
    	var obj = Type.obj, obj_is = obj.is, obj_del = obj.del, obj_map = obj.map;
    	var text = Type.text, text_random = text.random;
    	var soul_ = Node.soul._;
    	var u;
    	Type.node = Type.node || Node;

    	var State = Type.state;
    	State.lex = function(){ DEP('state.lex'); return State().toString(36).replace('.','') };
    	State.to = function(from, k, to){ DEP('state.to'); 
    		var val = (from||{})[k];
    		if(obj_is(val)){
    			val = obj_copy(val);
    		}
    		return State.ify(to, k, State.is(from, k), val, Node.soul(from));
    	}
    	;(function(){
    		State.map = function(cb, s, as){ DEP('state.map'); var u; // for use with Node.ify
    			var o = obj_is(o = cb || s)? o : null;
    			cb = fn_is(cb = cb || s)? cb : null;
    			if(o && !cb){
    				s = num_is(s)? s : State();
    				o[N_] = o[N_] || {};
    				obj_map(o, map, {o:o,s:s});
    				return o;
    			}
    			as = as || obj_is(s)? s : u;
    			s = num_is(s)? s : State();
    			return function(v, k, o, opt){
    				if(!cb){
    					map.call({o: o, s: s}, v,k);
    					return v;
    				}
    				cb.call(as || this || {}, v, k, o, opt);
    				if(obj_has(o,k) && u === o[k]){ return }
    				map.call({o: o, s: s}, v,k);
    			}
    		};
    		function map(v,k){
    			if(N_ === k){ return }
    			State.ify(this.o, k, this.s) ;
    		}
    	}());
    	var obj = Type.obj; obj.as; var obj_has = obj.has, obj_is = obj.is, obj_map = obj.map, obj_copy = obj.copy;
    	var num = Type.num, num_is = num.is;
    	var fn = Type.fn, fn_is = fn.is;
    	var N_ = Node._, u;

    	var Graph = {};
    (function(){
    		Graph.is = function(g, cb, fn, as){ DEP('graph.is'); // checks to see if an object is a valid graph.
    			if(!g || !obj_is(g) || obj_empty(g)){ return false } // must be an object.
    			return !obj_map(g, map, {cb:cb,fn:fn,as:as}); // makes sure it wasn't an empty object.
    		};
    		function map(n, s){ // we invert this because the way'? we check for this is via a negation.
    			if(!n || s !== Node.soul(n) || !Node.is(n, this.fn, this.as)){ return true } // it is true that this is an invalid graph.
    			if(!this.cb){ return }
    			nf.n = n; nf.as = this.as; // sequential race conditions aren't races.
    			this.cb.call(nf.as, n, s, nf);
    		}
    		function nf(fn){ // optional callback for each node.
    			if(fn){ Node.is(nf.n, fn, nf.as); } // where we then have an optional callback for each key/value.
    		}
    	}());
    (function(){
    		Graph.ify = function(obj, env, as){ DEP('graph.ify'); 
    			var at = {path: [], obj: obj};
    			if(!env){
    				env = {};
    			} else
    			if(typeof env === 'string'){
    				env = {soul: env};
    			} else
    			if('function' == typeof env){
    				env.map = env;
    			}
    			if(typeof as === 'string'){
    				env.soul = env.soul || as;
    				as = u;
    			}
    			if(env.soul){
    				at.link = Val.link.ify(env.soul);
    			}
    			env.shell = (as||{}).shell;
    			env.graph = env.graph || {};
    			env.seen = env.seen || [];
    			env.as = env.as || as;
    			node(env, at);
    			env.root = at.node;
    			return env.graph;
    		};
    		function node(env, at){ var tmp;
    			if(tmp = seen(env, at)){ return tmp }
    			at.env = env;
    			at.soul = soul;
    			if(Node.ify(at.obj, map, at)){
    				at.link = at.link || Val.link.ify(Node.soul(at.node));
    				if(at.obj !== env.shell){
    					env.graph[Val.link.is(at.link)] = at.node;
    				}
    			}
    			return at;
    		}
    		function map(v,k,n){
    			var at = this, env = at.env, is, tmp;
    			if(Node._ === k && obj_has(v,Val.link._)){
    				return n._; // TODO: Bug?
    			}
    			if(!(is = valid(v,k,n, at,env))){ return }
    			if(!k){
    				at.node = at.node || n || {};
    				if(obj_has(v, Node._) && Node.soul(v)){ // ? for safety ?
    					at.node._ = obj_copy(v._);
    				}
    				at.node = Node.soul.ify(at.node, Val.link.is(at.link));
    				at.link = at.link || Val.link.ify(Node.soul(at.node));
    			}
    			if(tmp = env.map){
    				tmp.call(env.as || {}, v,k,n, at);
    				if(obj_has(n,k)){
    					v = n[k];
    					if(u === v){
    						obj_del(n, k);
    						return;
    					}
    					if(!(is = valid(v,k,n, at,env))){ return }
    				}
    			}
    			if(!k){ return at.node }
    			if(true === is){
    				return v;
    			}
    			tmp = node(env, {obj: v, path: at.path.concat(k)});
    			if(!tmp.node){ return }
    			return tmp.link; //{'#': Node.soul(tmp.node)};
    		}
    		function soul(id){ var at = this;
    			var prev = Val.link.is(at.link), graph = at.env.graph;
    			at.link = at.link || Val.link.ify(id);
    			at.link[Val.link._] = id;
    			if(at.node && at.node[Node._]){
    				at.node[Node._][Val.link._] = id;
    			}
    			if(obj_has(graph, prev)){
    				graph[id] = graph[prev];
    				obj_del(graph, prev);
    			}
    		}
    		function valid(v,k,n, at,env){ var tmp;
    			if(Val.is(v)){ return true }
    			if(obj_is(v)){ return 1 }
    			if(tmp = env.invalid){
    				v = tmp.call(env.as || {}, v,k,n);
    				return valid(v,k,n, at,env);
    			}
    			env.err = "Invalid value at '" + at.path.concat(k).join('.') + "'!";
    			if(Type.list.is(v)){ env.err += " Use `.set(item)` instead of an Array."; }
    		}
    		function seen(env, at){
    			var arr = env.seen, i = arr.length, has;
    			while(i--){ has = arr[i];
    				if(at.obj === has.obj){ return has }
    			}
    			arr.push(at);
    		}
    	}());
    	Graph.node = function(node){ DEP('graph.node'); 
    		var soul = Node.soul(node);
    		if(!soul){ return }
    		return obj_put({}, soul, node);
    	}
    	;(function(){
    		Graph.to = function(graph, root, opt){ DEP('graph.to'); 
    			if(!graph){ return }
    			var obj = {};
    			opt = opt || {seen: {}};
    			obj_map(graph[root], map, {obj:obj, graph: graph, opt: opt});
    			return obj;
    		};
    		function map(v,k){ var tmp, obj;
    			if(Node._ === k){
    				if(obj_empty(v, Val.link._)){
    					return;
    				}
    				this.obj[k] = obj_copy(v);
    				return;
    			}
    			if(!(tmp = Val.link.is(v))){
    				this.obj[k] = v;
    				return;
    			}
    			if(obj = this.opt.seen[tmp]){
    				this.obj[k] = obj;
    				return;
    			}
    			this.obj[k] = this.opt.seen[tmp] = Graph.to(this.graph, tmp, this.opt);
    		}
    	}());
    	var fn_is = Type.fn.is;
    	var obj = Type.obj, obj_is = obj.is, obj_del = obj.del, obj_has = obj.has, obj_empty = obj.empty, obj_put = obj.put, obj_map = obj.map, obj_copy = obj.copy;
    	var u;
    	Type.graph = Type.graph || Graph;
    }());
    });

    var browser = gun;

    createCommonjsModule(function (module) {
    (function(){

      /* UNBUILD */
      function USE(arg, req){
        return req? commonjsRequire(arg) : arg.slice? USE[R(arg)] : function(mod, path){
          arg(mod = {exports: {}});
          USE[R(path)] = mod.exports;
        }
        function R(p){
          return p.split('/').slice(-1).toString().replace('.js','');
        }
      }
      { var MODULE = module; }
    USE(function(module){
        // Security, Encryption, and Authorization: SEA.js
        // MANDATORY READING: https://gun.eco/explainers/data/security.html
        // IT IS IMPLEMENTED IN A POLYFILL/SHIM APPROACH.
        // THIS IS AN EARLY ALPHA!

        if(typeof window !== "undefined"){ module.window = window; }

        var tmp = module.window || module, u;
        var SEA = tmp.SEA || {};

        if(SEA.window = module.window){ SEA.window.SEA = SEA; }

        try{ if(u+'' !== typeof MODULE){ MODULE.exports = SEA; } }catch(e){}
        module.exports = SEA;
      })(USE, './root');
    USE(function(module){
        var SEA = USE('./root');
        try{ if(SEA.window){
          if(location.protocol.indexOf('s') < 0
          && location.host.indexOf('localhost') < 0
          && ! /^127\.\d+\.\d+\.\d+$/.test(location.hostname)
          && location.protocol.indexOf('file:') < 0){
            console.warn('HTTPS needed for WebCrypto in SEA, redirecting...');
            location.protocol = 'https:'; // WebCrypto does NOT work without HTTPS!
          }
        } }catch(e){}
      })(USE, './https');
    USE(function(module){
        var u;
        if(u+''== typeof btoa){
          if(u+'' == typeof Buffer){
            try{ commonjsGlobal.Buffer = USE("buffer", 1).Buffer; }catch(e){ console.log("Please `npm install buffer` or add it to your package.json !"); }
          }
          commonjsGlobal.btoa = function(data){ return Buffer.from(data, "binary").toString("base64") };
          commonjsGlobal.atob = function(data){ return Buffer.from(data, "base64").toString("binary") };
        }
      })(USE, './base64');
    USE(function(module){
        USE('./base64');
        // This is Array extended to have .toString(['utf8'|'hex'|'base64'])
        function SeaArray() {}
        Object.assign(SeaArray, { from: Array.from });
        SeaArray.prototype = Object.create(Array.prototype);
        SeaArray.prototype.toString = function(enc, start, end) { enc = enc || 'utf8'; start = start || 0;
          const length = this.length;
          if (enc === 'hex') {
            const buf = new Uint8Array(this);
            return [ ...Array(((end && (end + 1)) || length) - start).keys()]
            .map((i) => buf[ i + start ].toString(16).padStart(2, '0')).join('')
          }
          if (enc === 'utf8') {
            return Array.from(
              { length: (end || length) - start },
              (_, i) => String.fromCharCode(this[ i + start])
            ).join('')
          }
          if (enc === 'base64') {
            return btoa(this)
          }
        };
        module.exports = SeaArray;
      })(USE, './array');
    USE(function(module){
        USE('./base64');
        // This is Buffer implementation used in SEA. Functionality is mostly
        // compatible with NodeJS 'safe-buffer' and is used for encoding conversions
        // between binary and 'hex' | 'utf8' | 'base64'
        // See documentation and validation for safe implementation in:
        // https://github.com/feross/safe-buffer#update
        var SeaArray = USE('./array');
        function SafeBuffer(...props) {
          console.warn('new SafeBuffer() is depreciated, please use SafeBuffer.from()');
          return SafeBuffer.from(...props)
        }
        SafeBuffer.prototype = Object.create(Array.prototype);
        Object.assign(SafeBuffer, {
          // (data, enc) where typeof data === 'string' then enc === 'utf8'|'hex'|'base64'
          from() {
            if (!Object.keys(arguments).length || arguments[0]==null) {
              throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
            }
            const input = arguments[0];
            let buf;
            if (typeof input === 'string') {
              const enc = arguments[1] || 'utf8';
              if (enc === 'hex') {
                const bytes = input.match(/([\da-fA-F]{2})/g)
                .map((byte) => parseInt(byte, 16));
                if (!bytes || !bytes.length) {
                  throw new TypeError('Invalid first argument for type \'hex\'.')
                }
                buf = SeaArray.from(bytes);
              } else if (enc === 'utf8' || 'binary' === enc) { // EDIT BY MARK: I think this is safe, tested it against a couple "binary" strings. This lets SafeBuffer match NodeJS Buffer behavior more where it safely btoas regular strings.
                const length = input.length;
                const words = new Uint16Array(length);
                Array.from({ length: length }, (_, i) => words[i] = input.charCodeAt(i));
                buf = SeaArray.from(words);
              } else if (enc === 'base64') {
                const dec = atob(input);
                const length = dec.length;
                const bytes = new Uint8Array(length);
                Array.from({ length: length }, (_, i) => bytes[i] = dec.charCodeAt(i));
                buf = SeaArray.from(bytes);
              } else if (enc === 'binary') { // deprecated by above comment
                buf = SeaArray.from(input); // some btoas were mishandled.
              } else {
                console.info('SafeBuffer.from unknown encoding: '+enc);
              }
              return buf
            }
            input.byteLength; // what is going on here? FOR MARTTI
            const length = input.byteLength ? input.byteLength : input.length;
            if (length) {
              let buf;
              if (input instanceof ArrayBuffer) {
                buf = new Uint8Array(input);
              }
              return SeaArray.from(buf || input)
            }
          },
          // This is 'safe-buffer.alloc' sans encoding support
          alloc(length, fill = 0 /*, enc*/ ) {
            return SeaArray.from(new Uint8Array(Array.from({ length: length }, () => fill)))
          },
          // This is normal UNSAFE 'buffer.alloc' or 'new Buffer(length)' - don't use!
          allocUnsafe(length) {
            return SeaArray.from(new Uint8Array(Array.from({ length : length })))
          },
          // This puts together array of array like members
          concat(arr) { // octet array
            if (!Array.isArray(arr)) {
              throw new TypeError('First argument must be Array containing ArrayBuffer or Uint8Array instances.')
            }
            return SeaArray.from(arr.reduce((ret, item) => ret.concat(Array.from(item)), []))
          }
        });
        SafeBuffer.prototype.from = SafeBuffer.from;
        SafeBuffer.prototype.toString = SeaArray.prototype.toString;

        module.exports = SafeBuffer;
      })(USE, './buffer');
    USE(function(module){
        const SEA = USE('./root');
        const api = {Buffer: USE('./buffer')};
        var o = {}, u;

        // ideally we can move away from JSON entirely? unlikely due to compatibility issues... oh well.
        JSON.parseAsync = JSON.parseAsync || function(t,cb,r){ var u; try{ cb(u, JSON.parse(t,r)); }catch(e){ cb(e); } };
        JSON.stringifyAsync = JSON.stringifyAsync || function(v,cb,r,s){ var u; try{ cb(u, JSON.stringify(v,r,s)); }catch(e){ cb(e); } };

        api.parse = function(t,r){ return new Promise(function(res, rej){
          JSON.parseAsync(t,function(err, raw){ err? rej(err) : res(raw); },r);
        })};
        api.stringify = function(v,r,s){ return new Promise(function(res, rej){
          JSON.stringifyAsync(v,function(err, raw){ err? rej(err) : res(raw); },r,s);
        })};

        if(SEA.window){
          api.crypto = window.crypto || window.msCrypto;
          api.subtle = (api.crypto||o).subtle || (api.crypto||o).webkitSubtle;
          api.TextEncoder = window.TextEncoder;
          api.TextDecoder = window.TextDecoder;
          api.random = (len) => api.Buffer.from(api.crypto.getRandomValues(new Uint8Array(api.Buffer.alloc(len))));
        }
        if(!api.TextDecoder)
        {
          const { TextEncoder, TextDecoder } = USE((u+'' == typeof MODULE?'.':'')+'./lib/text-encoding', 1);
          api.TextDecoder = TextDecoder;
          api.TextEncoder = TextEncoder;
        }
        if(!api.crypto)
        {
          try
          {
          var crypto = USE('crypto', 1);
          Object.assign(api, {
            crypto,
            random: (len) => api.Buffer.from(crypto.randomBytes(len))
          });      
          const { Crypto: WebCrypto } = USE('@peculiar/webcrypto', 1);
          api.ossl = api.subtle = new WebCrypto({directory: 'ossl'}).subtle; // ECDH
        }
        catch(e){
          console.log("Please `npm install @peculiar/webcrypto` or add it to your package.json !");
        }}

        module.exports = api;
      })(USE, './shim');
    USE(function(module){
        var SEA = USE('./root');
        var shim = USE('./shim');
        var s = {};
        s.pbkdf2 = {hash: {name : 'SHA-256'}, iter: 100000, ks: 64};
        s.ecdsa = {
          pair: {name: 'ECDSA', namedCurve: 'P-256'},
          sign: {name: 'ECDSA', hash: {name: 'SHA-256'}}
        };
        s.ecdh = {name: 'ECDH', namedCurve: 'P-256'};

        // This creates Web Cryptography API compliant JWK for sign/verify purposes
        s.jwk = function(pub, d){  // d === priv
          pub = pub.split('.');
          var x = pub[0], y = pub[1];
          var jwk = {kty: "EC", crv: "P-256", x: x, y: y, ext: true};
          jwk.key_ops = d ? ['sign'] : ['verify'];
          if(d){ jwk.d = d; }
          return jwk;
        };
        
        s.keyToJwk = function(keyBytes) {
          const keyB64 = keyBytes.toString('base64');
          const k = keyB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
          return { kty: 'oct', k: k, ext: false, alg: 'A256GCM' };
        };

        s.recall = {
          validity: 12 * 60 * 60, // internally in seconds : 12 hours
          hook: function(props){ return props } // { iat, exp, alias, remember } // or return new Promise((resolve, reject) => resolve(props)
        };

        s.check = function(t){ return (typeof t == 'string') && ('SEA{' === t.slice(0,4)) };
        s.parse = async function p(t){ try {
          var yes = (typeof t == 'string');
          if(yes && 'SEA{' === t.slice(0,4)){ t = t.slice(3); }
          return yes ? await shim.parse(t) : t;
          } catch (e) {}
          return t;
        };

        SEA.opt = s;
        module.exports = s;
      })(USE, './settings');
    USE(function(module){
        var shim = USE('./shim');
        module.exports = async function(d, o){
          var t = (typeof d == 'string')? d : await shim.stringify(d);
          var hash = await shim.subtle.digest({name: o||'SHA-256'}, new shim.TextEncoder().encode(t));
          return shim.Buffer.from(hash);
        };
      })(USE, './sha256');
    USE(function(module){
        // This internal func returns SHA-1 hashed data for KeyID generation
        const __shim = USE('./shim');
        const subtle = __shim.subtle;
        const ossl = __shim.ossl ? __shim.ossl : subtle;
        const sha1hash = (b) => ossl.digest({name: 'SHA-1'}, new ArrayBuffer(b));
        module.exports = sha1hash;
      })(USE, './sha1');
    USE(function(module){
        var SEA = USE('./root');
        var shim = USE('./shim');
        var S = USE('./settings');
        var sha = USE('./sha256');
        var u;

        SEA.work = SEA.work || (async (data, pair, cb, opt) => { try { // used to be named `proof`
          var salt = (pair||{}).epub || pair; // epub not recommended, salt should be random!
          opt = opt || {};
          if(salt instanceof Function){
            cb = salt;
            salt = u;
          }
          data = (typeof data == 'string')? data : await shim.stringify(data);
          if('sha' === (opt.name||'').toLowerCase().slice(0,3)){
            var rsha = shim.Buffer.from(await sha(data, opt.name), 'binary').toString(opt.encode || 'base64');
            if(cb){ try{ cb(rsha); }catch(e){console.log(e);} }
            return rsha;
          }
          salt = salt || shim.random(9);
          var key = await (shim.ossl || shim.subtle).importKey('raw', new shim.TextEncoder().encode(data), {name: opt.name || 'PBKDF2'}, false, ['deriveBits']);
          var work = await (shim.ossl || shim.subtle).deriveBits({
            name: opt.name || 'PBKDF2',
            iterations: opt.iterations || S.pbkdf2.iter,
            salt: new shim.TextEncoder().encode(opt.salt || salt),
            hash: opt.hash || S.pbkdf2.hash,
          }, key, opt.length || (S.pbkdf2.ks * 8));
          data = shim.random(data.length);  // Erase data in case of passphrase
          var r = shim.Buffer.from(work, 'binary').toString(opt.encode || 'base64');
          if(cb){ try{ cb(r); }catch(e){console.log(e);} }
          return r;
        } catch(e) { 
          console.log(e);
          SEA.err = e;
          if(SEA.throw){ throw e }
          if(cb){ cb(); }
          return;
        }});

        module.exports = SEA.work;
      })(USE, './work');
    USE(function(module){
        var SEA = USE('./root');
        var shim = USE('./shim');
        USE('./settings');

        SEA.name = SEA.name || (async (cb, opt) => { try {
          if(cb){ try{ cb(); }catch(e){console.log(e);} }
          return;
        } catch(e) {
          console.log(e);
          SEA.err = e;
          if(SEA.throw){ throw e }
          if(cb){ cb(); }
          return;
        }});

        //SEA.pair = async (data, proof, cb) => { try {
        SEA.pair = SEA.pair || (async (cb, opt) => { try {

          var ecdhSubtle = shim.ossl || shim.subtle;
          // First: ECDSA keys for signing/verifying...
          var sa = await shim.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, [ 'sign', 'verify' ])
          .then(async (keys) => {
            // privateKey scope doesn't leak out from here!
            //const { d: priv } = await shim.subtle.exportKey('jwk', keys.privateKey)
            var key = {};
            key.priv = (await shim.subtle.exportKey('jwk', keys.privateKey)).d;
            var pub = await shim.subtle.exportKey('jwk', keys.publicKey);
            //const pub = Buff.from([ x, y ].join(':')).toString('base64') // old
            key.pub = pub.x+'.'+pub.y; // new
            // x and y are already base64
            // pub is UTF8 but filename/URL safe (https://www.ietf.org/rfc/rfc3986.txt)
            // but split on a non-base64 letter.
            return key;
          });
          
          // To include PGPv4 kind of keyId:
          // const pubId = await SEA.keyid(keys.pub)
          // Next: ECDH keys for encryption/decryption...

          try{
          var dh = await ecdhSubtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveKey'])
          .then(async (keys) => {
            // privateKey scope doesn't leak out from here!
            var key = {};
            key.epriv = (await ecdhSubtle.exportKey('jwk', keys.privateKey)).d;
            var pub = await ecdhSubtle.exportKey('jwk', keys.publicKey);
            //const epub = Buff.from([ ex, ey ].join(':')).toString('base64') // old
            key.epub = pub.x+'.'+pub.y; // new
            // ex and ey are already base64
            // epub is UTF8 but filename/URL safe (https://www.ietf.org/rfc/rfc3986.txt)
            // but split on a non-base64 letter.
            return key;
          });
          }catch(e){
            if(SEA.window){ throw e }
            if(e == 'Error: ECDH is not a supported algorithm'){ console.log('Ignoring ECDH...'); }
            else { throw e }
          } dh = dh || {};

          var r = { pub: sa.pub, priv: sa.priv, /* pubId, */ epub: dh.epub, epriv: dh.epriv };
          if(cb){ try{ cb(r); }catch(e){console.log(e);} }
          return r;
        } catch(e) {
          console.log(e);
          SEA.err = e;
          if(SEA.throw){ throw e }
          if(cb){ cb(); }
          return;
        }});

        module.exports = SEA.pair;
      })(USE, './pair');
    USE(function(module){
        var SEA = USE('./root');
        var shim = USE('./shim');
        var S = USE('./settings');
        var sha = USE('./sha256');
        var u;

        SEA.sign = SEA.sign || (async (data, pair, cb, opt) => { try {
          opt = opt || {};
          if(!(pair||opt).priv){
            if(!SEA.I){ throw 'No signing key.' }
            pair = await SEA.I(null, {what: data, how: 'sign', why: opt.why});
          }
          if(u === data){ throw '`undefined` not allowed.' }
          var json = await S.parse(data);
          var check = opt.check = opt.check || json;
          if(SEA.verify && (SEA.opt.check(check) || (check && check.s && check.m))
          && u !== await SEA.verify(check, pair)){ // don't sign if we already signed it.
            var r = await S.parse(check);
            if(!opt.raw){ r = 'SEA' + await shim.stringify(r); }
            if(cb){ try{ cb(r); }catch(e){console.log(e);} }
            return r;
          }
          var pub = pair.pub;
          var priv = pair.priv;
          var jwk = S.jwk(pub, priv);
          var hash = await sha(json);
          var sig = await (shim.ossl || shim.subtle).importKey('jwk', jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign'])
          .then((key) => (shim.ossl || shim.subtle).sign({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, new Uint8Array(hash))); // privateKey scope doesn't leak out from here!
          var r = {m: json, s: shim.Buffer.from(sig, 'binary').toString(opt.encode || 'base64')};
          if(!opt.raw){ r = 'SEA' + await shim.stringify(r); }

          if(cb){ try{ cb(r); }catch(e){console.log(e);} }
          return r;
        } catch(e) {
          console.log(e);
          SEA.err = e;
          if(SEA.throw){ throw e }
          if(cb){ cb(); }
          return;
        }});

        module.exports = SEA.sign;
      })(USE, './sign');
    USE(function(module){
        var SEA = USE('./root');
        var shim = USE('./shim');
        var S = USE('./settings');
        var sha = USE('./sha256');
        var u;

        SEA.verify = SEA.verify || (async (data, pair, cb, opt) => { try {
          var json = await S.parse(data);
          if(false === pair){ // don't verify!
            var raw = await S.parse(json.m);
            if(cb){ try{ cb(raw); }catch(e){console.log(e);} }
            return raw;
          }
          opt = opt || {};
          // SEA.I // verify is free! Requires no user permission.
          var pub = pair.pub || pair;
          var key = SEA.opt.slow_leak? await SEA.opt.slow_leak(pub) : await (shim.ossl || shim.subtle).importKey('jwk', S.jwk(pub), {name: 'ECDSA', namedCurve: 'P-256'}, false, ['verify']);
          var hash = await sha(json.m);
          var buf, sig, check, tmp; try{
            buf = shim.Buffer.from(json.s, opt.encode || 'base64'); // NEW DEFAULT!
            sig = new Uint8Array(buf);
            check = await (shim.ossl || shim.subtle).verify({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, sig, new Uint8Array(hash));
            if(!check){ throw "Signature did not match." }
          }catch(e){
            if(SEA.opt.fallback){
              return await SEA.opt.fall_verify(data, pair, cb, opt);
            }
          }
          var r = check? await S.parse(json.m) : u;

          if(cb){ try{ cb(r); }catch(e){console.log(e);} }
          return r;
        } catch(e) {
          console.log(e); // mismatched owner FOR MARTTI
          SEA.err = e;
          if(SEA.throw){ throw e }
          if(cb){ cb(); }
          return;
        }});

        module.exports = SEA.verify;
        // legacy & ossl leak mitigation:

        var knownKeys = {};
        SEA.opt.slow_leak = pair => {
          if (knownKeys[pair]) return knownKeys[pair];
          var jwk = S.jwk(pair);
          knownKeys[pair] = (shim.ossl || shim.subtle).importKey("jwk", jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ["verify"]);
          return knownKeys[pair];
        };

        var O = SEA.opt;
        SEA.opt.fall_verify = async function(data, pair, cb, opt, f){
          if(f === SEA.opt.fallback){ throw "Signature did not match" } f = f || 1;
          var tmp = data||'';
          data = SEA.opt.unpack(data) || data;
          var json = await S.parse(data), pub = pair.pub || pair, key = await SEA.opt.slow_leak(pub);
          var hash = (f <= SEA.opt.fallback)? shim.Buffer.from(await shim.subtle.digest({name: 'SHA-256'}, new shim.TextEncoder().encode(await S.parse(json.m)))) : await sha(json.m); // this line is old bad buggy code but necessary for old compatibility.
          var buf; var sig; var check; try{
            buf = shim.Buffer.from(json.s, opt.encode || 'base64'); // NEW DEFAULT!
            sig = new Uint8Array(buf);
            check = await (shim.ossl || shim.subtle).verify({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, sig, new Uint8Array(hash));
            if(!check){ throw "Signature did not match." }
          }catch(e){ try{
            buf = shim.Buffer.from(json.s, 'utf8'); // AUTO BACKWARD OLD UTF8 DATA!
            sig = new Uint8Array(buf);
            check = await (shim.ossl || shim.subtle).verify({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, sig, new Uint8Array(hash));
            }catch(e){
            if(!check){ throw "Signature did not match." }
            }
          }
          var r = check? await S.parse(json.m) : u;
          O.fall_soul = tmp['#']; O.fall_key = tmp['.']; O.fall_val = data; O.fall_state = tmp['>'];
          if(cb){ try{ cb(r); }catch(e){console.log(e);} }
          return r;
        };
        SEA.opt.fallback = 2;

      })(USE, './verify');
    USE(function(module){
        var shim = USE('./shim');
        var S = USE('./settings');
        var sha256hash = USE('./sha256');

        const importGen = async (key, salt, opt) => {
          const combo = key + (salt || shim.random(8)).toString('utf8'); // new
          const hash = shim.Buffer.from(await sha256hash(combo), 'binary');
          
          const jwkKey = S.keyToJwk(hash);      
          return await shim.subtle.importKey('jwk', jwkKey, {name:'AES-GCM'}, false, ['encrypt', 'decrypt'])
        };
        module.exports = importGen;
      })(USE, './aeskey');
    USE(function(module){
        var SEA = USE('./root');
        var shim = USE('./shim');
        USE('./settings');
        var aeskey = USE('./aeskey');
        var u;

        SEA.encrypt = SEA.encrypt || (async (data, pair, cb, opt) => { try {
          opt = opt || {};
          var key = (pair||opt).epriv || pair;
          if(u === data){ throw '`undefined` not allowed.' }
          if(!key){
            if(!SEA.I){ throw 'No encryption key.' }
            pair = await SEA.I(null, {what: data, how: 'encrypt', why: opt.why});
            key = pair.epriv || pair;
          }
          var msg = (typeof data == 'string')? data : await shim.stringify(data);
          var rand = {s: shim.random(9), iv: shim.random(15)}; // consider making this 9 and 15 or 18 or 12 to reduce == padding.
          var ct = await aeskey(key, rand.s, opt).then((aes) => (/*shim.ossl ||*/ shim.subtle).encrypt({ // Keeping the AES key scope as private as possible...
            name: opt.name || 'AES-GCM', iv: new Uint8Array(rand.iv)
          }, aes, new shim.TextEncoder().encode(msg)));
          var r = {
            ct: shim.Buffer.from(ct, 'binary').toString(opt.encode || 'base64'),
            iv: rand.iv.toString(opt.encode || 'base64'),
            s: rand.s.toString(opt.encode || 'base64')
          };
          if(!opt.raw){ r = 'SEA' + await shim.stringify(r); }

          if(cb){ try{ cb(r); }catch(e){console.log(e);} }
          return r;
        } catch(e) { 
          console.log(e);
          SEA.err = e;
          if(SEA.throw){ throw e }
          if(cb){ cb(); }
          return;
        }});

        module.exports = SEA.encrypt;
      })(USE, './encrypt');
    USE(function(module){
        var SEA = USE('./root');
        var shim = USE('./shim');
        var S = USE('./settings');
        var aeskey = USE('./aeskey');

        SEA.decrypt = SEA.decrypt || (async (data, pair, cb, opt) => { try {
          opt = opt || {};
          var key = (pair||opt).epriv || pair;
          if(!key){
            if(!SEA.I){ throw 'No decryption key.' }
            pair = await SEA.I(null, {what: data, how: 'decrypt', why: opt.why});
            key = pair.epriv || pair;
          }
          var json = await S.parse(data);
          var buf, bufiv, bufct; try{
            buf = shim.Buffer.from(json.s, opt.encode || 'base64');
            bufiv = shim.Buffer.from(json.iv, opt.encode || 'base64');
            bufct = shim.Buffer.from(json.ct, opt.encode || 'base64');
            var ct = await aeskey(key, buf, opt).then((aes) => (/*shim.ossl ||*/ shim.subtle).decrypt({  // Keeping aesKey scope as private as possible...
              name: opt.name || 'AES-GCM', iv: new Uint8Array(bufiv), tagLength: 128
            }, aes, new Uint8Array(bufct)));
          }catch(e){
            if('utf8' === opt.encode){ throw "Could not decrypt" }
            if(SEA.opt.fallback){
              opt.encode = 'utf8';
              return await SEA.decrypt(data, pair, cb, opt);
            }
          }
          var r = await S.parse(new shim.TextDecoder('utf8').decode(ct));
          if(cb){ try{ cb(r); }catch(e){console.log(e);} }
          return r;
        } catch(e) { 
          console.log(e);
          SEA.err = e;
          if(SEA.throw){ throw e }
          if(cb){ cb(); }
          return;
        }});

        module.exports = SEA.decrypt;
      })(USE, './decrypt');
    USE(function(module){
        var SEA = USE('./root');
        var shim = USE('./shim');
        USE('./settings');
        // Derive shared secret from other's pub and my epub/epriv 
        SEA.secret = SEA.secret || (async (key, pair, cb, opt) => { try {
          opt = opt || {};
          if(!pair || !pair.epriv || !pair.epub){
            if(!SEA.I){ throw 'No secret mix.' }
            pair = await SEA.I(null, {what: key, how: 'secret', why: opt.why});
          }
          var pub = key.epub || key;
          var epub = pair.epub;
          var epriv = pair.epriv;
          var ecdhSubtle = shim.ossl || shim.subtle;
          var pubKeyData = keysToEcdhJwk(pub);
          var props = Object.assign({ public: await ecdhSubtle.importKey(...pubKeyData, true, []) },{name: 'ECDH', namedCurve: 'P-256'}); // Thanks to @sirpy !
          var privKeyData = keysToEcdhJwk(epub, epriv);
          var derived = await ecdhSubtle.importKey(...privKeyData, false, ['deriveBits']).then(async (privKey) => {
            // privateKey scope doesn't leak out from here!
            var derivedBits = await ecdhSubtle.deriveBits(props, privKey, 256);
            var rawBits = new Uint8Array(derivedBits);
            var derivedKey = await ecdhSubtle.importKey('raw', rawBits,{ name: 'AES-GCM', length: 256 }, true, [ 'encrypt', 'decrypt' ]);
            return ecdhSubtle.exportKey('jwk', derivedKey).then(({ k }) => k);
          });
          var r = derived;
          if(cb){ try{ cb(r); }catch(e){console.log(e);} }
          return r;
        } catch(e) {
          console.log(e);
          SEA.err = e;
          if(SEA.throw){ throw e }
          if(cb){ cb(); }
          return;
        }});

        // can this be replaced with settings.jwk?
        var keysToEcdhJwk = (pub, d) => { // d === priv
          //var [ x, y ] = shim.Buffer.from(pub, 'base64').toString('utf8').split(':') // old
          var [ x, y ] = pub.split('.'); // new
          var jwk = d ? { d: d } : {};
          return [  // Use with spread returned value...
            'jwk',
            Object.assign(
              jwk,
              { x: x, y: y, kty: 'EC', crv: 'P-256', ext: true }
            ), // ??? refactor
            {name: 'ECDH', namedCurve: 'P-256'}
          ]
        };

        module.exports = SEA.secret;
      })(USE, './secret');
    USE(function(module){
        var SEA = USE('./root');
        // This is to certify that a group of "certificants" can "put" anything at a group of matched "paths" to the certificate authority's graph
        SEA.certify = SEA.certify || (async (certificants, policy = {}, authority, cb, opt = {}) => { try {
          /*
          The Certify Protocol was made out of love by a Vietnamese code enthusiast. Vietnamese people around the world deserve respect!
          IMPORTANT: A Certificate is like a Signature. No one knows who (authority) created/signed a cert until you put it into their graph.
          "certificants": '*' or a String (Bob.pub) || an Object that contains "pub" as a key || an array of [object || string]. These people will have the rights.
          "policy": A string ('inbox'), or a RAD/LEX object {'*': 'inbox'}, or an Array of RAD/LEX objects or strings. RAD/LEX object can contain key "?" with indexOf("*") > -1 to force key equals certificant pub. This rule is used to check against soul+'/'+key using Gun.text.match or String.match.
          "authority": Key pair or priv of the certificate authority.
          "cb": A callback function after all things are done.
          "opt": If opt.expiry (a timestamp) is set, SEA won't sync data after opt.expiry. If opt.block is set, SEA will look for block before syncing.
          */
          console.log('SEA.certify() is an early experimental community supported method that may change API behavior without warning in any future version.');

          certificants = (() => {
            var data = [];
            if (certificants) {
              if ((typeof certificants === 'string' || Array.isArray(certificants)) && certificants.indexOf('*') > -1) return '*'
              if (typeof certificants === 'string') return certificants
              if (Array.isArray(certificants)) {
                if (certificants.length === 1 && certificants[0]) return typeof certificants[0] === 'object' && certificants[0].pub ? certificants[0].pub : typeof certificants[0] === 'string' ? certificants[0] : null
                certificants.map(certificant => {
                  if (typeof certificant ==='string') data.push(certificant);
                  else if (typeof certificant === 'object' && certificant.pub) data.push(certificant.pub);
                });
              }

              if (typeof certificants === 'object' && certificants.pub) return certificants.pub
              return data.length > 0 ? data : null
            }
            return
          })();

          if (!certificants) return console.log("No certificant found.")

          const expiry = opt.expiry && (typeof opt.expiry === 'number' || typeof opt.expiry === 'string') ? parseFloat(opt.expiry) : null;
          const readPolicy = (policy || {}).read ? policy.read : null;
          const writePolicy = (policy || {}).write ? policy.write : typeof policy === 'string' || Array.isArray(policy) || policy["+"] || policy["#"] || policy["."] || policy["="] || policy["*"] || policy[">"] || policy["<"] ? policy : null;
          // The "blacklist" feature is now renamed to "block". Why ? BECAUSE BLACK LIVES MATTER!
          // We can now use 3 keys: block, blacklist, ban
          const block = (opt || {}).block || (opt || {}).blacklist || (opt || {}).ban || {};
          const readBlock = block.read && (typeof block.read === 'string' || (block.read || {})['#']) ? block.read : null;
          const writeBlock = typeof block === 'string' ? block : block.write && (typeof block.write === 'string' || block.write['#']) ? block.write : null;

          if (!readPolicy && !writePolicy) return console.log("No policy found.")

          // reserved keys: c, e, r, w, rb, wb
          const data = JSON.stringify({
            c: certificants,
            ...(expiry ? {e: expiry} : {}), // inject expiry if possible
            ...(readPolicy ? {r: readPolicy }  : {}), // "r" stands for read, which means read permission.
            ...(writePolicy ? {w: writePolicy} : {}), // "w" stands for write, which means write permission.
            ...(readBlock ? {rb: readBlock} : {}), // inject READ block if possible
            ...(writeBlock ? {wb: writeBlock} : {}), // inject WRITE block if possible
          });

          const certificate = await SEA.sign(data, authority, null, {raw:1});

          var r = certificate;
          if(!opt.raw){ r = 'SEA'+JSON.stringify(r); }
          if(cb){ try{ cb(r); }catch(e){console.log(e);} }
          return r;
        } catch(e) {
          SEA.err = e;
          if(SEA.throw){ throw e }
          if(cb){ cb(); }
          return;
        }});

        module.exports = SEA.certify;
      })(USE, './certify');
    USE(function(module){
        var shim = USE('./shim');
        // Practical examples about usage found in tests.
        var SEA = USE('./root');
        SEA.work = USE('./work');
        SEA.sign = USE('./sign');
        SEA.verify = USE('./verify');
        SEA.encrypt = USE('./encrypt');
        SEA.decrypt = USE('./decrypt');
        SEA.certify = USE('./certify');
        //SEA.opt.aeskey = USE('./aeskey'); // not official! // this causes problems in latest WebCrypto.

        SEA.random = SEA.random || shim.random;

        // This is Buffer used in SEA and usable from Gun/SEA application also.
        // For documentation see https://nodejs.org/api/buffer.html
        SEA.Buffer = SEA.Buffer || USE('./buffer');

        // These SEA functions support now ony Promises or
        // async/await (compatible) code, use those like Promises.
        //
        // Creates a wrapper library around Web Crypto API
        // for various AES, ECDSA, PBKDF2 functions we called above.
        // Calculate public key KeyID aka PGPv4 (result: 8 bytes as hex string)
        SEA.keyid = SEA.keyid || (async (pub) => {
          try {
            // base64('base64(x):base64(y)') => shim.Buffer(xy)
            const pb = shim.Buffer.concat(
              pub.replace(/-/g, '+').replace(/_/g, '/').split('.')
              .map((t) => shim.Buffer.from(t, 'base64'))
            );
            // id is PGPv4 compliant raw key
            const id = shim.Buffer.concat([
              shim.Buffer.from([0x99, pb.length / 0x100, pb.length % 0x100]), pb
            ]);
            const sha1 = await sha1hash(id);
            const hash = shim.Buffer.from(sha1, 'binary');
            return hash.toString('hex', hash.length - 8)  // 16-bit ID as hex
          } catch (e) {
            console.log(e);
            throw e
          }
        });
        // all done!
        // Obviously it is missing MANY necessary features. This is only an alpha release.
        // Please experiment with it, audit what I've done so far, and complain about what needs to be added.
        // SEA should be a full suite that is easy and seamless to use.
        // Again, scroll naer the top, where I provide an EXAMPLE of how to create a user and sign in.
        // Once logged in, the rest of the code you just read handled automatically signing/validating data.
        // But all other behavior needs to be equally easy, like opinionated ways of
        // Adding friends (trusted public keys), sending private messages, etc.
        // Cheers! Tell me what you think.
        ((SEA.window||{}).GUN||{}).SEA = SEA;

        module.exports = SEA;
        // -------------- END SEA MODULES --------------------
        // -- BEGIN SEA+GUN MODULES: BUNDLED BY DEFAULT UNTIL OTHERS USE SEA ON OWN -------
      })(USE, './sea');
    USE(function(module){
        var SEA = USE('./sea'), Gun, u;
        if(SEA.window){
          Gun = SEA.window.GUN || {chain:{}};
        } else {
          Gun = USE((u+'' == typeof MODULE?'.':'')+'./gun', 1);
        }
        SEA.GUN = Gun;

        function User(root){ 
          this._ = {$: this};
        }
        User.prototype = (function(){ function F(){} F.prototype = Gun.chain; return new F() }()); // Object.create polyfill
        User.prototype.constructor = User;

        // let's extend the gun chain with a `user` function.
        // only one user can be logged in at a time, per gun instance.
        Gun.chain.user = function(pub){
          var gun = this, root = gun.back(-1), user;
          if(pub){
            pub = SEA.opt.pub((pub._||'')['#']) || pub;
            return root.get('~'+pub);
          }
          if(user = root.back('user')){ return user }
          var root = (root._), at = root, uuid = at.opt.uuid || lex;
          (at = (user = at.user = gun.chain(new User))._).opt = {};
          at.opt.uuid = function(cb){
            var id = uuid(), pub = root.user;
            if(!pub || !(pub = pub.is) || !(pub = pub.pub)){ return id }
            id = '~' + pub + '/' + id;
            if(cb && cb.call){ cb(null, id); }
            return id;
          };
          return user;
        };
        function lex(){ return Gun.state().toString(36).replace('.','') }
        Gun.User = User;
        User.GUN = Gun;
        User.SEA = Gun.SEA = SEA;
        module.exports = User;
      })(USE, './user');
    USE(function(module){
        var u, Gun = (''+u != typeof window)? (window.Gun||{chain:{}}) : USE((''+u === typeof MODULE?'.':'')+'./gun', 1);
        Gun.chain.then = function(cb, opt){
          var gun = this, p = (new Promise(function(res, rej){
            gun.once(res, opt);
          }));
          return cb? p.then(cb) : p;
        };
      })(USE, './then');
    USE(function(module){
        var User = USE('./user'), SEA = User.SEA, Gun = User.GUN, noop = function(){};

        // Well first we have to actually create a user. That is what this function does.
        User.prototype.create = function(...args){
          var pair = typeof args[0] === 'object' && (args[0].pub || args[0].epub) ? args[0] : typeof args[1] === 'object' && (args[1].pub || args[1].epub) ? args[1] : null;
          var alias = pair && (pair.pub || pair.epub) ? pair.pub : typeof args[0] === 'string' ? args[0] : null;
          var pass = pair && (pair.pub || pair.epub) ? pair : alias && typeof args[1] === 'string' ? args[1] : null;
          var cb = args.filter(arg => typeof arg === 'function')[0] || null; // cb now can stand anywhere, after alias/pass or pair
          var opt = args && args.length > 1 && typeof args[args.length-1] === 'object' ? args[args.length-1] : {}; // opt is always the last parameter which typeof === 'object' and stands after cb
          
          var gun = this, cat = (gun._), root = gun.back(-1);
          cb = cb || noop;
          opt = opt || {};
          if(false !== opt.check){
            var err;
            if(!alias){ err = "No user."; }
            if((pass||'').length < 8){ err = "Password too short!"; }
            if(err){
              cb({err: Gun.log(err)});
              return gun;
            }
          }
          if(cat.ing){
            (cb || noop)({err: Gun.log("User is already being created or authenticated!"), wait: true});
            return gun;
          }
          cat.ing = true;
          var act = {};
          act.a = function(pubs){
            act.pubs = pubs;
            if(pubs && !opt.already){
              // If we can enforce that a user name is already taken, it might be nice to try, but this is not guaranteed.
              var ack = {err: Gun.log('User already created!')};
              cat.ing = false;
              (cb || noop)(ack);
              gun.leave();
              return;
            }
            act.salt = String.random(64); // pseudo-randomly create a salt, then use PBKDF2 function to extend the password with it.
            SEA.work(pass, act.salt, act.b); // this will take some short amount of time to produce a proof, which slows brute force attacks.
          };
          act.b = function(proof){
            act.proof = proof;
            pair ? act.c(pair) : SEA.pair(act.c); // generate a brand new key pair or use the existing.
          };
          act.c = function(pair){
            var tmp;
            act.pair = pair || {};
            if(tmp = cat.root.user){
              tmp._.sea = pair;
              tmp.is = {pub: pair.pub, epub: pair.epub, alias: alias};
            }
            // the user's public key doesn't need to be signed. But everything else needs to be signed with it! // we have now automated it! clean up these extra steps now!
            act.data = {pub: pair.pub};
            act.d();
          };
          act.d = function(){
            act.data.alias = alias;
            act.e();
          };
          act.e = function(){
            act.data.epub = act.pair.epub; 
            SEA.encrypt({priv: act.pair.priv, epriv: act.pair.epriv}, act.proof, act.f, {raw:1}); // to keep the private key safe, we AES encrypt it with the proof of work!
          };
          act.f = function(auth){
            act.data.auth = JSON.stringify({ek: auth, s: act.salt}); 
            act.g(act.data.auth);
          };
          act.g = function(auth){ var tmp;
            act.data.auth = act.data.auth || auth;
            root.get(tmp = '~'+act.pair.pub).put(act.data).on(act.h); // awesome, now we can actually save the user with their public key as their ID.
            var link = {}; link[tmp] = {'#': tmp}; root.get('~@'+alias).put(link).get(tmp).on(act.i); // next up, we want to associate the alias with the public key. So we add it to the alias list.
          };
          act.h = function(data, key, msg, eve){
            eve.off(); act.h.ok = 1; act.i();
          };
          act.i = function(data, key, msg, eve){
            if(eve){ act.i.ok = 1; eve.off(); }
            if(!act.h.ok || !act.i.ok){ return }
            cat.ing = false;
            cb({ok: 0, pub: act.pair.pub}); // callback that the user has been created. (Note: ok = 0 because we didn't wait for disk to ack)
            if(noop === cb){ pair ? gun.auth(pair) : gun.auth(alias, pass); } // if no callback is passed, auto-login after signing up.
          };
          root.get('~@'+alias).once(act.a);
          return gun;
        };
        User.prototype.leave = function(opt, cb){
          var gun = this, user = (gun.back(-1)._).user;
          if(user){
            delete user.is;
            delete user._.is;
            delete user._.sea;
          }
          if(SEA.window){
            try{var sS = {};
            sS = window.sessionStorage;
            delete sS.recall;
            delete sS.pair;
            }catch(e){}      }
          return gun;
        };
      })(USE, './create');
    USE(function(module){
        var User = USE('./user'), SEA = User.SEA, Gun = User.GUN, noop = function(){};
        // now that we have created a user, we want to authenticate them!
        User.prototype.auth = function(...args){ // TODO: this PR with arguments need to be cleaned up / refactored.
          var pair = typeof args[0] === 'object' && (args[0].pub || args[0].epub) ? args[0] : typeof args[1] === 'object' && (args[1].pub || args[1].epub) ? args[1] : null;
          var alias = !pair && typeof args[0] === 'string' ? args[0] : null;
          var pass = alias && typeof args[1] === 'string' ? args[1] : null;
          var cb = args.filter(arg => typeof arg === 'function')[0] || null; // cb now can stand anywhere, after alias/pass or pair
          var opt = args && args.length > 1 && typeof args[args.length-1] === 'object' ? args[args.length-1] : {}; // opt is always the last parameter which typeof === 'object' and stands after cb
          
          var gun = this, cat = (gun._), root = gun.back(-1);
          
          if(cat.ing){
            (cb || noop)({err: Gun.log("User is already being created or authenticated!"), wait: true});
            return gun;
          }
          cat.ing = true;
          
          var act = {}, u;
          act.a = function(data){
            if(!data){ return act.b() }
            if(!data.pub){
              var tmp = []; Object.keys(data).forEach(function(k){ if('_'==k){ return } tmp.push(data[k]); });
              return act.b(tmp);
            }
            if(act.name){ return act.f(data) }
            act.c((act.data = data).auth);
          };
          act.b = function(list){
            var get = (act.list = (act.list||[]).concat(list||[])).shift();
            if(u === get){
              if(act.name){ return act.err('Your user account is not published for dApps to access, please consider syncing it online, or allowing local access by adding your device as a peer.') }
              return act.err('Wrong user or password.') 
            }
            root.get(get).once(act.a);
          };
          act.c = function(auth){
            if(u === auth){ return act.b() }
            if('string' == typeof auth){ return act.c(obj_ify(auth)) } // in case of legacy
            SEA.work(pass, (act.auth = auth).s, act.d, act.enc); // the proof of work is evidence that we've spent some time/effort trying to log in, this slows brute force.
          };
          act.d = function(proof){
            SEA.decrypt(act.auth.ek, proof, act.e, act.enc);
          };
          act.e = function(half){
            if(u === half){
              if(!act.enc){ // try old format
                act.enc = {encode: 'utf8'};
                return act.c(act.auth);
              } act.enc = null; // end backwards
              return act.b();
            }
            act.half = half;
            act.f(act.data);
          };
          act.f = function(pair){
            var half = act.half || {}, data = act.data || {};
            act.g(act.lol = {pub: pair.pub || data.pub, epub: pair.epub || data.epub, priv: pair.priv || half.priv, epriv: pair.epriv || half.epriv});
          };
          act.g = function(pair){
            if(!pair || !pair.pub || !pair.epub){ return act.b() }
            act.pair = pair;
            var user = (root._).user, at = (user._);
            at.tag;
            var upt = at.opt;
            at = user._ = root.get('~'+pair.pub)._;
            at.opt = upt;
            // add our credentials in-memory only to our root user instance
            user.is = {pub: pair.pub, epub: pair.epub, alias: alias || pair.pub};
            at.sea = act.pair;
            cat.ing = false;
            try{if(pass && u == (obj_ify(cat.root.graph['~'+pair.pub].auth)||'')[':']){ opt.shuffle = opt.change = pass; } }catch(e){} // migrate UTF8 & Shuffle!
            opt.change? act.z() : (cb || noop)(at);
            if(SEA.window && ((gun.back('user')._).opt||opt).remember){
              // TODO: this needs to be modular.
              try{var sS = {};
              sS = window.sessionStorage; // TODO: FIX BUG putting on `.is`!
              sS.recall = true;
              sS.pair = JSON.stringify(pair); // auth using pair is more reliable than alias/pass
              }catch(e){}
            }
            try{
              if(root._.tag.auth){ // auth handle might not be registered yet
              (root._).on('auth', at); // TODO: Deprecate this, emit on user instead! Update docs when you do.
              } else { setTimeout(function(){ (root._).on('auth', at); },1); } // if not, hackily add a timeout.
              //at.on('auth', at) // Arrgh, this doesn't work without event "merge" code, but "merge" code causes stack overflow and crashes after logging in & trying to write data.
            }catch(e){
              Gun.log("Your 'auth' callback crashed with:", e);
            }
          };
          act.z = function(){
            // password update so encrypt private key using new pwd + salt
            act.salt = String.random(64); // pseudo-random
            SEA.work(opt.change, act.salt, act.y);
          };
          act.y = function(proof){
            SEA.encrypt({priv: act.pair.priv, epriv: act.pair.epriv}, proof, act.x, {raw:1});
          };
          act.x = function(auth){
            act.w(JSON.stringify({ek: auth, s: act.salt}));
          };
          act.w = function(auth){
            if(opt.shuffle){ // delete in future!
              console.log('migrate core account from UTF8 & shuffle');
              var tmp = {}; Object.keys(act.data).forEach(function(k){ tmp[k] = act.data[k]; });
              delete tmp._;
              tmp.auth = auth;
              root.get('~'+act.pair.pub).put(tmp);
            } // end delete
            root.get('~'+act.pair.pub).get('auth').put(auth, cb || noop);
          };
          act.err = function(e){
            var ack = {err: Gun.log(e || 'User cannot be found!')};
            cat.ing = false;
            (cb || noop)(ack);
          };
          act.plugin = function(name){
            if(!(act.name = name)){ return act.err() }
            var tmp = [name];
            if('~' !== name[0]){
              tmp[1] = '~'+name;
              tmp[2] = '~@'+name;
            }
            act.b(tmp);
          };
          if(pair){
            act.g(pair);
          } else
          if(alias){
            root.get('~@'+alias).once(act.a);
          } else
          if(!alias && !pass){
            SEA.name(act.plugin);
          }
          return gun;
        };
        function obj_ify(o){
          if('string' != typeof o){ return o }
          try{o = JSON.parse(o);
          }catch(e){o={};}      return o;
        }
      })(USE, './auth');
    USE(function(module){
        var User = USE('./user'), SEA = User.SEA; User.GUN;
        User.prototype.recall = function(opt, cb){
          var gun = this, root = gun.back(-1);
          opt = opt || {};
          if(opt && opt.sessionStorage){
            if(SEA.window){
              try{
                var sS = {};
                sS = window.sessionStorage; // TODO: FIX BUG putting on `.is`!
                if(sS){
                  (root._).opt.remember = true;
                  ((gun.back('user')._).opt||opt).remember = true;
                  if(sS.recall || sS.pair) root.user().auth(JSON.parse(sS.pair), cb); // pair is more reliable than alias/pass
                }
              }catch(e){}
            }
            return gun;
          }
          /*
            TODO: copy mhelander's expiry code back in.
            Although, we should check with community,
            should expiry be core or a plugin?
          */
          return gun;
        };
      })(USE, './recall');
    USE(function(module){
        var User = USE('./user'), SEA = User.SEA, Gun = User.GUN, noop = function(){};
        User.prototype.pair = function(){
          var user = this, proxy; // undeprecated, hiding with proxies.
          try{ proxy = new Proxy({DANGER:'\u2620'}, {get: function(t,p,r){
            if(!user.is || !(user._||'').sea){ return }
            return user._.sea[p];
          }});}catch(e){}
          return proxy;
        };
        // If authenticated user wants to delete his/her account, let's support it!
        User.prototype.delete = async function(alias, pass, cb){
          console.log("user.delete() IS DEPRECATED AND WILL BE MOVED TO A MODULE!!!");
          var gun = this; gun.back(-1); var user = gun.back('user');
          try {
            user.auth(alias, pass, function(ack){
              var pub = (user.is||{}).pub;
              // Delete user data
              user.map().once(function(){ this.put(null); });
              // Wipe user data from memory
              user.leave();
              (cb || noop)({ok: 0});
            });
          } catch (e) {
            Gun.log('User.delete failed! Error:', e);
          }
          return gun;
        };
        User.prototype.alive = async function(){
          console.log("user.alive() IS DEPRECATED!!!");
          const gunRoot = this.back(-1);
          try {
            // All is good. Should we do something more with actual recalled data?
            await authRecall(gunRoot);
            return gunRoot._.user._
          } catch (e) {
            const err = 'No session!';
            Gun.log(err);
            throw { err }
          }
        };
        User.prototype.trust = async function(user){
          console.log("`.trust` API MAY BE DELETED OR CHANGED OR RENAMED, DO NOT USE!");
          // TODO: BUG!!! SEA `node` read listener needs to be async, which means core needs to be async too.
          //gun.get('alice').get('age').trust(bob);
          if (Gun.is(user)) {
            user.get('pub').get((ctx, ev) => {
              console.log(ctx, ev);
            });
          }
          user.get('trust').get(path).put(theirPubkey);

          // do a lookup on this gun chain directly (that gets bob's copy of the data)
          // do a lookup on the metadata trust table for this path (that gets all the pubkeys allowed to write on this path)
          // do a lookup on each of those pubKeys ON the path (to get the collab data "layers")
          // THEN you perform Jachen's mix operation
          // and return the result of that to...
        };
        User.prototype.grant = function(to, cb){
          console.log("`.grant` API MAY BE DELETED OR CHANGED OR RENAMED, DO NOT USE!");
          var gun = this, user = gun.back(-1).user(), pair = user._.sea, path = '';
          gun.back(function(at){ if(at.is){ return } path += (at.get||''); });
          (async function(){
          var enc, sec = await user.get('grant').get(pair.pub).get(path).then();
          sec = await SEA.decrypt(sec, pair);
          if(!sec){
            sec = SEA.random(16).toString();
            enc = await SEA.encrypt(sec, pair);
            user.get('grant').get(pair.pub).get(path).put(enc);
          }
          var pub = to.get('pub').then();
          var epub = to.get('epub').then();
          pub = await pub; epub = await epub;
          var dh = await SEA.secret(epub, pair);
          enc = await SEA.encrypt(sec, dh);
          user.get('grant').get(pub).get(path).put(enc, cb);
          }());
          return gun;
        };
        User.prototype.secret = function(data, cb){
          console.log("`.secret` API MAY BE DELETED OR CHANGED OR RENAMED, DO NOT USE!");
          var gun = this, user = gun.back(-1).user(), pair = user.pair(), path = '';
          gun.back(function(at){ if(at.is){ return } path += (at.get||''); });
          (async function(){
          var enc, sec = await user.get('trust').get(pair.pub).get(path).then();
          sec = await SEA.decrypt(sec, pair);
          if(!sec){
            sec = SEA.random(16).toString();
            enc = await SEA.encrypt(sec, pair);
            user.get('trust').get(pair.pub).get(path).put(enc);
          }
          enc = await SEA.encrypt(data, sec);
          gun.put(enc, cb);
          }());
          return gun;
        };

        /**
         * returns the decrypted value, encrypted by secret
         * @returns {Promise<any>}
         // Mark needs to review 1st before officially supported
        User.prototype.decrypt = function(cb) {
          let gun = this,
            path = ''
          gun.back(function(at) {
            if (at.is) {
              return
            }
            path += at.get || ''
          })
          return gun
            .then(async data => {
              if (data == null) {
                return
              }
              const user = gun.back(-1).user()
              const pair = user.pair()
              let sec = await user
                .get('trust')
                .get(pair.pub)
                .get(path)
              sec = await SEA.decrypt(sec, pair)
              if (!sec) {
                return data
              }
              let decrypted = await SEA.decrypt(data, sec)
              return decrypted
            })
            .then(res => {
              cb && cb(res)
              return res
            })
        }
        */
        module.exports = User;
      })(USE, './share');
    USE(function(module){
        var SEA = USE('./sea'), S = USE('./settings'), noop = function() {}, u;
        var Gun = (''+u != typeof window)? (window.Gun||{on:noop}) : USE((''+u === typeof MODULE?'.':'')+'./gun', 1);
        // After we have a GUN extension to make user registration/login easy, we then need to handle everything else.

        // We do this with a GUN adapter, we first listen to when a gun instance is created (and when its options change)
        Gun.on('opt', function(at){
          if(!at.sea){ // only add SEA once per instance, on the "at" context.
            at.sea = {own: {}};
            at.on('put', check, at); // SEA now runs its firewall on HAM diffs, not all i/o.
          }
          this.to.next(at); // make sure to call the "next" middleware adapter.
        });

        // Alright, this next adapter gets run at the per node level in the graph database.
        // correction: 2020 it gets run on each key/value pair in a node upon a HAM diff.
        // This will let us verify that every property on a node has a value signed by a public key we trust.
        // If the signature does not match, the data is just `undefined` so it doesn't get passed on.
        // If it does match, then we transform the in-memory "view" of the data into its plain value (without the signature).
        // Now NOTE! Some data is "system" data, not user data. Example: List of public keys, aliases, etc.
        // This data is self-enforced (the value can only match its ID), but that is handled in the `security` function.
        // From the self-enforced data, we can see all the edges in the graph that belong to a public key.
        // Example: ~ASDF is the ID of a node with ASDF as its public key, signed alias and salt, and
        // its encrypted private key, but it might also have other signed values on it like `profile = <ID>` edge.
        // Using that directed edge's ID, we can then track (in memory) which IDs belong to which keys.
        // Here is a problem: Multiple public keys can "claim" any node's ID, so this is dangerous!
        // This means we should ONLY trust our "friends" (our key ring) public keys, not any ones.
        // I have not yet added that to SEA yet in this alpha release. That is coming soon, but beware in the meanwhile!

        function check(msg){ // REVISE / IMPROVE, NO NEED TO PASS MSG/EVE EACH SUB?
          var eve = this, at = eve.as, put = msg.put, soul = put['#'], key = put['.'], val = put[':'], state = put['>'], id = msg['#'], tmp;
          if(!soul || !key){ return }
          if((msg._||'').faith && (at.opt||'').faith && 'function' == typeof msg._){
            SEA.opt.pack(put, function(raw){
            SEA.verify(raw, false, function(data){ // this is synchronous if false
              put['='] = SEA.opt.unpack(data);
              eve.to.next(msg);
            });});
            return 
          }
          var no = function(why){ at.on('in', {'@': id, err: msg.err = why}); }; // exploit internal relay stun for now, maybe violates spec, but testing for now. // Note: this may be only the sharded message, not original batch.
          //var no = function(why){ msg.ack(why) };
          (msg._||'').DBG && ((msg._||'').DBG.c = +new Date);
          if(0 <= soul.indexOf('<?')){ // special case for "do not sync data X old" forget
            // 'a~pub.key/b<?9'
            tmp = parseFloat(soul.split('<?')[1]||'');
            if(tmp && (state < (Gun.state() - (tmp * 1000)))){ // sec to ms
              (tmp = msg._) && (tmp.stun) && (tmp.stun--); // THIS IS BAD CODE! It assumes GUN internals do something that will probably change in future, but hacking in now.
              return; // omit!
            }
          }
          
          if('~@' === soul){  // special case for shared system data, the list of aliases.
            check.alias(eve, msg, val, key, soul, at, no); return;
          }
          if('~@' === soul.slice(0,2)){ // special case for shared system data, the list of public keys for an alias.
            check.pubs(eve, msg, val, key, soul, at, no); return;
          }
          //if('~' === soul.slice(0,1) && 2 === (tmp = soul.slice(1)).split('.').length){ // special case, account data for a public key.
          if(tmp = SEA.opt.pub(soul)){ // special case, account data for a public key.
            check.pub(eve, msg, val, key, soul, at, no, at.user||'', tmp); return;
          }
          if(0 <= soul.indexOf('#')){ // special case for content addressing immutable hashed data.
            check.hash(eve, msg, val, key, soul, at, no); return;
          } 
          check.any(eve, msg, val, key, soul, at, no, at.user||''); return;
        }
        check.hash = function(eve, msg, val, key, soul, at, no){
          SEA.work(val, null, function(data){
            if(data && data === key.split('#').slice(-1)[0]){ return eve.to.next(msg) }
            no("Data hash not same as hash!");
          }, {name: 'SHA-256'});
        };
        check.alias = function(eve, msg, val, key, soul, at, no){ // Example: {_:#~@, ~@alice: {#~@alice}}
          if(!val){ return no("Data must exist!") } // data MUST exist
          if('~@'+key === link_is(val)){ return eve.to.next(msg) } // in fact, it must be EXACTLY equal to itself
          no("Alias not same!"); // if it isn't, reject.
        };
        check.pubs = function(eve, msg, val, key, soul, at, no){ // Example: {_:#~@alice, ~asdf: {#~asdf}}
          if(!val){ return no("Alias must exist!") } // data MUST exist
          if(key === link_is(val)){ return eve.to.next(msg) } // and the ID must be EXACTLY equal to its property
          no("Alias not same!"); // that way nobody can tamper with the list of public keys.
        };
        check.pub = async function(eve, msg, val, key, soul, at, no, user, pub){ var tmp; // Example: {_:#~asdf, hello:'world'~fdsa}}
          const raw = await S.parse(val) || {};
          const verify = (certificate, certificant, cb) => {
            if (certificate.m && certificate.s && certificant && pub)
              // now verify certificate
              return SEA.verify(certificate, pub, data => { // check if "pub" (of the graph owner) really issued this cert
                if (u !== data && u !== data.e && msg.put['>'] && msg.put['>'] > parseFloat(data.e)) return no("Certificate expired.") // certificate expired
                // "data.c" = a list of certificants/certified users
                // "data.w" = lex WRITE permission, in the future, there will be "data.r" which means lex READ permission
                if (u !== data && data.c && data.w && (data.c === certificant || data.c.indexOf('*' ) > -1)) {
                  // ok, now "certificant" is in the "certificants" list, but is "path" allowed? Check path
                  let path = soul.indexOf('/') > -1 ? soul.replace(soul.substring(0, soul.indexOf('/') + 1), '') : '';
                  String.match = String.match || Gun.text.match;
                  const w = Array.isArray(data.w) ? data.w : typeof data.w === 'object' || typeof data.w === 'string' ? [data.w] : [];
                  for (const lex of w) {
                    if ((String.match(path, lex['#']) && String.match(key, lex['.'])) || (!lex['.'] && String.match(path, lex['#'])) || (!lex['#'] && String.match(key, lex['.'])) || String.match((path ? path + '/' + key : key), lex['#'] || lex)) {
                      // is Certificant forced to present in Path
                      if (lex['+'] && lex['+'].indexOf('*') > -1 && path && path.indexOf(certificant) == -1 && key.indexOf(certificant) == -1) return no(`Path "${path}" or key "${key}" must contain string "${certificant}".`)
                      // path is allowed, but is there any WRITE block? Check it out
                      if (data.wb && (typeof data.wb === 'string' || ((data.wb || {})['#']))) { // "data.wb" = path to the WRITE block
                        var root = eve.as.root.$.back(-1);
                        if (typeof data.wb === 'string' && '~' !== data.wb.slice(0, 1)) root = root.get('~' + pub);
                        return root.get(data.wb).get(certificant).once(value => {
                          if (value && (value === 1 || value === true)) return no(`Certificant ${certificant} blocked.`)
                          return cb(data)
                        })
                      }
                      return cb(data)
                    }
                  }
                  return no("Certificate verification fail.")
                }
              })
            return
          };
          
          if ('pub' === key && '~' + pub === soul) {
            if (val === pub) return eve.to.next(msg) // the account MUST match `pub` property that equals the ID of the public key.
            return no("Account not same!")
          }

          if ((tmp = user.is) && tmp.pub && !raw['*'] && !raw['+'] && (pub === tmp.pub || (pub !== tmp.pub && ((msg._.msg || {}).opt || {}).cert))){
            SEA.opt.pack(msg.put, packed => {
              SEA.sign(packed, (user._).sea, async function(data) {
                if (u === data) return no(SEA.err || 'Signature fail.')
                msg.put[':'] = {':': tmp = SEA.opt.unpack(data.m), '~': data.s};
                msg.put['='] = tmp;
      
                // if writing to own graph, just allow it
                if (pub === user.is.pub) {
                  if (tmp = link_is(val)) (at.sea.own[tmp] = at.sea.own[tmp] || {})[pub] = 1;
                  JSON.stringifyAsync(msg.put[':'], function(err,s){
                    if(err){ return no(err || "Stringify error.") }
                    msg.put[':'] = s;
                    return eve.to.next(msg);
                  });
                  return
                }
      
                // if writing to other's graph, check if cert exists then try to inject cert into put, also inject self pub so that everyone can verify the put
                if (pub !== user.is.pub && ((msg._.msg || {}).opt || {}).cert) {
                  const cert = await S.parse(msg._.msg.opt.cert);
                  // even if cert exists, we must verify it
                  if (cert && cert.m && cert.s)
                    verify(cert, user.is.pub, _ => {
                      msg.put[':']['+'] = cert; // '+' is a certificate
                      msg.put[':']['*'] = user.is.pub; // '*' is pub of the user who puts
                      JSON.stringifyAsync(msg.put[':'], function(err,s){
                        if(err){ return no(err || "Stringify error.") }
                        msg.put[':'] = s;
                        return eve.to.next(msg);
                      });
                      return
                    });
                }
              }, {raw: 1});
            });
            return;
          }

          SEA.opt.pack(msg.put, packed => {
            SEA.verify(packed, raw['*'] || pub, function(data){ var tmp;
              data = SEA.opt.unpack(data);
              if (u === data) return no("Unverified data.") // make sure the signature matches the account it claims to be on. // reject any updates that are signed with a mismatched account.
              if ((tmp = link_is(data)) && pub === SEA.opt.pub(tmp)) (at.sea.own[tmp] = at.sea.own[tmp] || {})[pub] = 1;
              
              // check if cert ('+') and putter's pub ('*') exist
              if (raw['+'] && raw['+']['m'] && raw['+']['s'] && raw['*'])
                // now verify certificate
                verify(raw['+'], raw['*'], _ => {
                  msg.put['='] = data;
                  return eve.to.next(msg);
                });
              else {
                msg.put['='] = data;
                return eve.to.next(msg);
              }
            });
          });
          return
        };
        check.any = function(eve, msg, val, key, soul, at, no, user){      if(at.opt.secure){ return no("Soul missing public key at '" + key + "'.") }
          // TODO: Ask community if should auto-sign non user-graph data.
          at.on('secure', function(msg){ this.off();
            if(!at.opt.secure){ return eve.to.next(msg) }
            no("Data cannot be changed.");
          }).on.on('secure', msg);
          return;
        };

        var valid = Gun.valid, link_is = function(d,l){ return 'string' == typeof (l = valid(d)) && l }; (Gun.state||'').ify;

        var pubcut = /[^\w_-]/; // anything not alphanumeric or _ -
        SEA.opt.pub = function(s){
          if(!s){ return }
          s = s.split('~');
          if(!s || !(s = s[1])){ return }
          s = s.split(pubcut).slice(0,2);
          if(!s || 2 != s.length){ return }
          if('@' === (s[0]||'')[0]){ return }
          s = s.slice(0,2).join('.');
          return s;
        };
        SEA.opt.stringy = function(t){
          // TODO: encrypt etc. need to check string primitive. Make as breaking change.
        };
        SEA.opt.pack = function(d,cb,k, n,s){ var tmp, f; // pack for verifying
          if(SEA.opt.check(d)){ return cb(d) }
          if(d && d['#'] && d['.'] && d['>']){ tmp = d[':']; f = 1; }
          JSON.parseAsync(f? tmp : d, function(err, meta){
            var sig = ((u !== (meta||'')[':']) && (meta||'')['~']); // or just ~ check?
            if(!sig){ cb(d); return }
            cb({m: {'#':s||d['#'],'.':k||d['.'],':':(meta||'')[':'],'>':d['>']||Gun.state.is(n, k)}, s: sig});
          });
        };
        var O = SEA.opt;
        SEA.opt.unpack = function(d, k, n){ var tmp;
          if(u === d){ return }
          if(d && (u !== (tmp = d[':']))){ return tmp }
          k = k || O.fall_key; if(!n && O.fall_val){ n = {}; n[k] = O.fall_val; }
          if(!k || !n){ return }
          if(d === n[k]){ return d }
          if(!SEA.opt.check(n[k])){ return d }
          var soul = (n && n._ && n._['#']) || O.fall_soul, s = Gun.state.is(n, k) || O.fall_state;
          if(d && 4 === d.length && soul === d[0] && k === d[1] && fl(s) === fl(d[3])){
            return d[2];
          }
          if(s < SEA.opt.shuffle_attack){
            return d;
          }
        };
        SEA.opt.shuffle_attack = 1546329600000; // Jan 1, 2019
        var fl = Math.floor; // TODO: Still need to fix inconsistent state issue.
        // TODO: Potential bug? If pub/priv key starts with `-`? IDK how possible.

      })(USE, './index');
    }());
    });

    createCommonjsModule(function (module) {
    (function(){

      /* UNBUILD */
      function USE(arg, req){
        return req? commonjsRequire(arg) : arg.slice? USE[R(arg)] : function(mod, path){
          arg(mod = {exports: {}});
          USE[R(path)] = mod.exports;
        }
        function R(p){
          return p.split('/').slice(-1).toString().replace('.js','');
        }
      }
      { var MODULE = module; }
    USE(function(module){
        if(typeof window !== "undefined"){ module.window = window; }
        var tmp = module.window || module;
    		var AXE = tmp.AXE || function(){};

        if(AXE.window = module.window){ AXE.window.AXE = AXE; }
        try{ if(typeof MODULE !== "undefined"){ MODULE.exports = AXE; } }catch(e){}
        module.exports = AXE;
    	})(USE, './root');
    USE(function(module){

    		var AXE = USE('./root'), Gun = (AXE.window||'').Gun || USE('./gun', 1);
    		(Gun.AXE = AXE).GUN = AXE.Gun = Gun;

        if(!Gun.window){ try{ USE('./lib/axe', 1); }catch(e){} }
    		Gun.on('opt', function(at){ start(at) ; this.to.next(at); }); // make sure to call the "next" middleware adapter.

    		function start(root){
    			if(root.axe){ return }
    			var opt = root.opt, peers = opt.peers;
    			if(false === opt.axe){ return }
    			if((typeof process !== "undefined") && 'false' === ''+(process.env||'').AXE){ return }
    			if(!Gun.window){ return }
    			root.axe = {}; var tmp, id;
    			tmp = peers[id = 'http://localhost:8765/gun'] = peers[id] || {};
    			tmp.id = tmp.url = id;
    			tmp.retry = tmp.retry || 0; // BUG: Check 0?
    			console.log("AXE enabled: Trying to find network via (1) local peer (2) last used peers (3) hard coded peers.");
    			console.log("Warning: AXE alpha became super slow & laggy, now in testing only mode!");
    			var last = JSON.parse((localStorage||'')[(opt.file||'')+'axe/']||null) || {};
    			Object.keys(last.peers||'').forEach(function(key){
    				tmp = peers[id = key] = peers[id] || {};
    				tmp.id = tmp.url = id;
    			});
    			tmp = peers[id = 'https://ovh.era.eco/gun'] = peers[id] || {};
    			tmp.id = tmp.url = id;

    			var mesh = opt.mesh = opt.mesh || Gun.Mesh(root); // DAM!
    			mesh.way = function(msg){
    				if(root.$ === msg.$ || (msg._||'').via){
    					mesh.say(msg, opt.peers);
    					return;
    				}
    				var at = (msg.$||'')._;
    				if(!at){ mesh.say(msg, opt.peers); return }
    				if(msg.get){
    					if(at.axe){ return } // don't ask for it again!
    					at.axe = {};
    				}
    				mesh.say(msg, opt.peers);
    			};
    		}

    		module.exports = AXE;
    	})(USE, './axe');
    }());
    });

    // Database
    const db = browser(['http://localhost:8765/gun', 'https://gun-manhattan.herokuapp.com/gun']);

    // Gun User
    const user = db.user().recall({sessionStorage: true});

    // Current User's username
    const username = writable('');

    user.get('alias').on(v => username.set(v));

    db.on('auth', async(event) => {
        const alias = await user.get('alias'); // username string
        username.set(alias);
    });

    var showdown = createCommonjsModule(function (module) {
    (function(){
    /**
     * Created by Tivie on 13-07-2015.
     */

    function getDefaultOpts (simple) {

      var defaultOptions = {
        omitExtraWLInCodeBlocks: {
          defaultValue: false,
          describe: 'Omit the default extra whiteline added to code blocks',
          type: 'boolean'
        },
        noHeaderId: {
          defaultValue: false,
          describe: 'Turn on/off generated header id',
          type: 'boolean'
        },
        prefixHeaderId: {
          defaultValue: false,
          describe: 'Add a prefix to the generated header ids. Passing a string will prefix that string to the header id. Setting to true will add a generic \'section-\' prefix',
          type: 'string'
        },
        rawPrefixHeaderId: {
          defaultValue: false,
          describe: 'Setting this option to true will prevent showdown from modifying the prefix. This might result in malformed IDs (if, for instance, the " char is used in the prefix)',
          type: 'boolean'
        },
        ghCompatibleHeaderId: {
          defaultValue: false,
          describe: 'Generate header ids compatible with github style (spaces are replaced with dashes, a bunch of non alphanumeric chars are removed)',
          type: 'boolean'
        },
        rawHeaderId: {
          defaultValue: false,
          describe: 'Remove only spaces, \' and " from generated header ids (including prefixes), replacing them with dashes (-). WARNING: This might result in malformed ids',
          type: 'boolean'
        },
        headerLevelStart: {
          defaultValue: false,
          describe: 'The header blocks level start',
          type: 'integer'
        },
        parseImgDimensions: {
          defaultValue: false,
          describe: 'Turn on/off image dimension parsing',
          type: 'boolean'
        },
        simplifiedAutoLink: {
          defaultValue: false,
          describe: 'Turn on/off GFM autolink style',
          type: 'boolean'
        },
        excludeTrailingPunctuationFromURLs: {
          defaultValue: false,
          describe: 'Excludes trailing punctuation from links generated with autoLinking',
          type: 'boolean'
        },
        literalMidWordUnderscores: {
          defaultValue: false,
          describe: 'Parse midword underscores as literal underscores',
          type: 'boolean'
        },
        literalMidWordAsterisks: {
          defaultValue: false,
          describe: 'Parse midword asterisks as literal asterisks',
          type: 'boolean'
        },
        strikethrough: {
          defaultValue: false,
          describe: 'Turn on/off strikethrough support',
          type: 'boolean'
        },
        tables: {
          defaultValue: false,
          describe: 'Turn on/off tables support',
          type: 'boolean'
        },
        tablesHeaderId: {
          defaultValue: false,
          describe: 'Add an id to table headers',
          type: 'boolean'
        },
        ghCodeBlocks: {
          defaultValue: true,
          describe: 'Turn on/off GFM fenced code blocks support',
          type: 'boolean'
        },
        tasklists: {
          defaultValue: false,
          describe: 'Turn on/off GFM tasklist support',
          type: 'boolean'
        },
        smoothLivePreview: {
          defaultValue: false,
          describe: 'Prevents weird effects in live previews due to incomplete input',
          type: 'boolean'
        },
        smartIndentationFix: {
          defaultValue: false,
          description: 'Tries to smartly fix indentation in es6 strings',
          type: 'boolean'
        },
        disableForced4SpacesIndentedSublists: {
          defaultValue: false,
          description: 'Disables the requirement of indenting nested sublists by 4 spaces',
          type: 'boolean'
        },
        simpleLineBreaks: {
          defaultValue: false,
          description: 'Parses simple line breaks as <br> (GFM Style)',
          type: 'boolean'
        },
        requireSpaceBeforeHeadingText: {
          defaultValue: false,
          description: 'Makes adding a space between `#` and the header text mandatory (GFM Style)',
          type: 'boolean'
        },
        ghMentions: {
          defaultValue: false,
          description: 'Enables github @mentions',
          type: 'boolean'
        },
        ghMentionsLink: {
          defaultValue: 'https://github.com/{u}',
          description: 'Changes the link generated by @mentions. Only applies if ghMentions option is enabled.',
          type: 'string'
        },
        encodeEmails: {
          defaultValue: true,
          description: 'Encode e-mail addresses through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities',
          type: 'boolean'
        },
        openLinksInNewWindow: {
          defaultValue: false,
          description: 'Open all links in new windows',
          type: 'boolean'
        },
        backslashEscapesHTMLTags: {
          defaultValue: false,
          description: 'Support for HTML Tag escaping. ex: \<div>foo\</div>',
          type: 'boolean'
        },
        emoji: {
          defaultValue: false,
          description: 'Enable emoji support. Ex: `this is a :smile: emoji`',
          type: 'boolean'
        },
        underline: {
          defaultValue: false,
          description: 'Enable support for underline. Syntax is double or triple underscores: `__underline word__`. With this option enabled, underscores no longer parses into `<em>` and `<strong>`',
          type: 'boolean'
        },
        completeHTMLDocument: {
          defaultValue: false,
          description: 'Outputs a complete html document, including `<html>`, `<head>` and `<body>` tags',
          type: 'boolean'
        },
        metadata: {
          defaultValue: false,
          description: 'Enable support for document metadata (defined at the top of the document between `«««` and `»»»` or between `---` and `---`).',
          type: 'boolean'
        },
        splitAdjacentBlockquotes: {
          defaultValue: false,
          description: 'Split adjacent blockquote blocks',
          type: 'boolean'
        }
      };
      if (simple === false) {
        return JSON.parse(JSON.stringify(defaultOptions));
      }
      var ret = {};
      for (var opt in defaultOptions) {
        if (defaultOptions.hasOwnProperty(opt)) {
          ret[opt] = defaultOptions[opt].defaultValue;
        }
      }
      return ret;
    }

    function allOptionsOn () {
      var options = getDefaultOpts(true),
          ret = {};
      for (var opt in options) {
        if (options.hasOwnProperty(opt)) {
          ret[opt] = true;
        }
      }
      return ret;
    }

    /**
     * Created by Tivie on 06-01-2015.
     */

    // Private properties
    var showdown = {},
        parsers = {},
        extensions = {},
        globalOptions = getDefaultOpts(true),
        setFlavor = 'vanilla',
        flavor = {
          github: {
            omitExtraWLInCodeBlocks:              true,
            simplifiedAutoLink:                   true,
            excludeTrailingPunctuationFromURLs:   true,
            literalMidWordUnderscores:            true,
            strikethrough:                        true,
            tables:                               true,
            tablesHeaderId:                       true,
            ghCodeBlocks:                         true,
            tasklists:                            true,
            disableForced4SpacesIndentedSublists: true,
            simpleLineBreaks:                     true,
            requireSpaceBeforeHeadingText:        true,
            ghCompatibleHeaderId:                 true,
            ghMentions:                           true,
            backslashEscapesHTMLTags:             true,
            emoji:                                true,
            splitAdjacentBlockquotes:             true
          },
          original: {
            noHeaderId:                           true,
            ghCodeBlocks:                         false
          },
          ghost: {
            omitExtraWLInCodeBlocks:              true,
            parseImgDimensions:                   true,
            simplifiedAutoLink:                   true,
            excludeTrailingPunctuationFromURLs:   true,
            literalMidWordUnderscores:            true,
            strikethrough:                        true,
            tables:                               true,
            tablesHeaderId:                       true,
            ghCodeBlocks:                         true,
            tasklists:                            true,
            smoothLivePreview:                    true,
            simpleLineBreaks:                     true,
            requireSpaceBeforeHeadingText:        true,
            ghMentions:                           false,
            encodeEmails:                         true
          },
          vanilla: getDefaultOpts(true),
          allOn: allOptionsOn()
        };

    /**
     * helper namespace
     * @type {{}}
     */
    showdown.helper = {};

    /**
     * TODO LEGACY SUPPORT CODE
     * @type {{}}
     */
    showdown.extensions = {};

    /**
     * Set a global option
     * @static
     * @param {string} key
     * @param {*} value
     * @returns {showdown}
     */
    showdown.setOption = function (key, value) {
      globalOptions[key] = value;
      return this;
    };

    /**
     * Get a global option
     * @static
     * @param {string} key
     * @returns {*}
     */
    showdown.getOption = function (key) {
      return globalOptions[key];
    };

    /**
     * Get the global options
     * @static
     * @returns {{}}
     */
    showdown.getOptions = function () {
      return globalOptions;
    };

    /**
     * Reset global options to the default values
     * @static
     */
    showdown.resetOptions = function () {
      globalOptions = getDefaultOpts(true);
    };

    /**
     * Set the flavor showdown should use as default
     * @param {string} name
     */
    showdown.setFlavor = function (name) {
      if (!flavor.hasOwnProperty(name)) {
        throw Error(name + ' flavor was not found');
      }
      showdown.resetOptions();
      var preset = flavor[name];
      setFlavor = name;
      for (var option in preset) {
        if (preset.hasOwnProperty(option)) {
          globalOptions[option] = preset[option];
        }
      }
    };

    /**
     * Get the currently set flavor
     * @returns {string}
     */
    showdown.getFlavor = function () {
      return setFlavor;
    };

    /**
     * Get the options of a specified flavor. Returns undefined if the flavor was not found
     * @param {string} name Name of the flavor
     * @returns {{}|undefined}
     */
    showdown.getFlavorOptions = function (name) {
      if (flavor.hasOwnProperty(name)) {
        return flavor[name];
      }
    };

    /**
     * Get the default options
     * @static
     * @param {boolean} [simple=true]
     * @returns {{}}
     */
    showdown.getDefaultOptions = function (simple) {
      return getDefaultOpts(simple);
    };

    /**
     * Get or set a subParser
     *
     * subParser(name)       - Get a registered subParser
     * subParser(name, func) - Register a subParser
     * @static
     * @param {string} name
     * @param {function} [func]
     * @returns {*}
     */
    showdown.subParser = function (name, func) {
      if (showdown.helper.isString(name)) {
        if (typeof func !== 'undefined') {
          parsers[name] = func;
        } else {
          if (parsers.hasOwnProperty(name)) {
            return parsers[name];
          } else {
            throw Error('SubParser named ' + name + ' not registered!');
          }
        }
      }
    };

    /**
     * Gets or registers an extension
     * @static
     * @param {string} name
     * @param {object|function=} ext
     * @returns {*}
     */
    showdown.extension = function (name, ext) {

      if (!showdown.helper.isString(name)) {
        throw Error('Extension \'name\' must be a string');
      }

      name = showdown.helper.stdExtName(name);

      // Getter
      if (showdown.helper.isUndefined(ext)) {
        if (!extensions.hasOwnProperty(name)) {
          throw Error('Extension named ' + name + ' is not registered!');
        }
        return extensions[name];

        // Setter
      } else {
        // Expand extension if it's wrapped in a function
        if (typeof ext === 'function') {
          ext = ext();
        }

        // Ensure extension is an array
        if (!showdown.helper.isArray(ext)) {
          ext = [ext];
        }

        var validExtension = validate(ext, name);

        if (validExtension.valid) {
          extensions[name] = ext;
        } else {
          throw Error(validExtension.error);
        }
      }
    };

    /**
     * Gets all extensions registered
     * @returns {{}}
     */
    showdown.getAllExtensions = function () {
      return extensions;
    };

    /**
     * Remove an extension
     * @param {string} name
     */
    showdown.removeExtension = function (name) {
      delete extensions[name];
    };

    /**
     * Removes all extensions
     */
    showdown.resetExtensions = function () {
      extensions = {};
    };

    /**
     * Validate extension
     * @param {array} extension
     * @param {string} name
     * @returns {{valid: boolean, error: string}}
     */
    function validate (extension, name) {

      var errMsg = (name) ? 'Error in ' + name + ' extension->' : 'Error in unnamed extension',
          ret = {
            valid: true,
            error: ''
          };

      if (!showdown.helper.isArray(extension)) {
        extension = [extension];
      }

      for (var i = 0; i < extension.length; ++i) {
        var baseMsg = errMsg + ' sub-extension ' + i + ': ',
            ext = extension[i];
        if (typeof ext !== 'object') {
          ret.valid = false;
          ret.error = baseMsg + 'must be an object, but ' + typeof ext + ' given';
          return ret;
        }

        if (!showdown.helper.isString(ext.type)) {
          ret.valid = false;
          ret.error = baseMsg + 'property "type" must be a string, but ' + typeof ext.type + ' given';
          return ret;
        }

        var type = ext.type = ext.type.toLowerCase();

        // normalize extension type
        if (type === 'language') {
          type = ext.type = 'lang';
        }

        if (type === 'html') {
          type = ext.type = 'output';
        }

        if (type !== 'lang' && type !== 'output' && type !== 'listener') {
          ret.valid = false;
          ret.error = baseMsg + 'type ' + type + ' is not recognized. Valid values: "lang/language", "output/html" or "listener"';
          return ret;
        }

        if (type === 'listener') {
          if (showdown.helper.isUndefined(ext.listeners)) {
            ret.valid = false;
            ret.error = baseMsg + '. Extensions of type "listener" must have a property called "listeners"';
            return ret;
          }
        } else {
          if (showdown.helper.isUndefined(ext.filter) && showdown.helper.isUndefined(ext.regex)) {
            ret.valid = false;
            ret.error = baseMsg + type + ' extensions must define either a "regex" property or a "filter" method';
            return ret;
          }
        }

        if (ext.listeners) {
          if (typeof ext.listeners !== 'object') {
            ret.valid = false;
            ret.error = baseMsg + '"listeners" property must be an object but ' + typeof ext.listeners + ' given';
            return ret;
          }
          for (var ln in ext.listeners) {
            if (ext.listeners.hasOwnProperty(ln)) {
              if (typeof ext.listeners[ln] !== 'function') {
                ret.valid = false;
                ret.error = baseMsg + '"listeners" property must be an hash of [event name]: [callback]. listeners.' + ln +
                  ' must be a function but ' + typeof ext.listeners[ln] + ' given';
                return ret;
              }
            }
          }
        }

        if (ext.filter) {
          if (typeof ext.filter !== 'function') {
            ret.valid = false;
            ret.error = baseMsg + '"filter" must be a function, but ' + typeof ext.filter + ' given';
            return ret;
          }
        } else if (ext.regex) {
          if (showdown.helper.isString(ext.regex)) {
            ext.regex = new RegExp(ext.regex, 'g');
          }
          if (!(ext.regex instanceof RegExp)) {
            ret.valid = false;
            ret.error = baseMsg + '"regex" property must either be a string or a RegExp object, but ' + typeof ext.regex + ' given';
            return ret;
          }
          if (showdown.helper.isUndefined(ext.replace)) {
            ret.valid = false;
            ret.error = baseMsg + '"regex" extensions must implement a replace string or function';
            return ret;
          }
        }
      }
      return ret;
    }

    /**
     * Validate extension
     * @param {object} ext
     * @returns {boolean}
     */
    showdown.validateExtension = function (ext) {

      var validateExtension = validate(ext, null);
      if (!validateExtension.valid) {
        console.warn(validateExtension.error);
        return false;
      }
      return true;
    };

    /**
     * showdownjs helper functions
     */

    if (!showdown.hasOwnProperty('helper')) {
      showdown.helper = {};
    }

    /**
     * Check if var is string
     * @static
     * @param {string} a
     * @returns {boolean}
     */
    showdown.helper.isString = function (a) {
      return (typeof a === 'string' || a instanceof String);
    };

    /**
     * Check if var is a function
     * @static
     * @param {*} a
     * @returns {boolean}
     */
    showdown.helper.isFunction = function (a) {
      var getType = {};
      return a && getType.toString.call(a) === '[object Function]';
    };

    /**
     * isArray helper function
     * @static
     * @param {*} a
     * @returns {boolean}
     */
    showdown.helper.isArray = function (a) {
      return Array.isArray(a);
    };

    /**
     * Check if value is undefined
     * @static
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
     */
    showdown.helper.isUndefined = function (value) {
      return typeof value === 'undefined';
    };

    /**
     * ForEach helper function
     * Iterates over Arrays and Objects (own properties only)
     * @static
     * @param {*} obj
     * @param {function} callback Accepts 3 params: 1. value, 2. key, 3. the original array/object
     */
    showdown.helper.forEach = function (obj, callback) {
      // check if obj is defined
      if (showdown.helper.isUndefined(obj)) {
        throw new Error('obj param is required');
      }

      if (showdown.helper.isUndefined(callback)) {
        throw new Error('callback param is required');
      }

      if (!showdown.helper.isFunction(callback)) {
        throw new Error('callback param must be a function/closure');
      }

      if (typeof obj.forEach === 'function') {
        obj.forEach(callback);
      } else if (showdown.helper.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
          callback(obj[i], i, obj);
        }
      } else if (typeof (obj) === 'object') {
        for (var prop in obj) {
          if (obj.hasOwnProperty(prop)) {
            callback(obj[prop], prop, obj);
          }
        }
      } else {
        throw new Error('obj does not seem to be an array or an iterable object');
      }
    };

    /**
     * Standardidize extension name
     * @static
     * @param {string} s extension name
     * @returns {string}
     */
    showdown.helper.stdExtName = function (s) {
      return s.replace(/[_?*+\/\\.^-]/g, '').replace(/\s/g, '').toLowerCase();
    };

    function escapeCharactersCallback (wholeMatch, m1) {
      var charCodeToEscape = m1.charCodeAt(0);
      return '¨E' + charCodeToEscape + 'E';
    }

    /**
     * Callback used to escape characters when passing through String.replace
     * @static
     * @param {string} wholeMatch
     * @param {string} m1
     * @returns {string}
     */
    showdown.helper.escapeCharactersCallback = escapeCharactersCallback;

    /**
     * Escape characters in a string
     * @static
     * @param {string} text
     * @param {string} charsToEscape
     * @param {boolean} afterBackslash
     * @returns {XML|string|void|*}
     */
    showdown.helper.escapeCharacters = function (text, charsToEscape, afterBackslash) {
      // First we have to escape the escape characters so that
      // we can build a character class out of them
      var regexString = '([' + charsToEscape.replace(/([\[\]\\])/g, '\\$1') + '])';

      if (afterBackslash) {
        regexString = '\\\\' + regexString;
      }

      var regex = new RegExp(regexString, 'g');
      text = text.replace(regex, escapeCharactersCallback);

      return text;
    };

    /**
     * Unescape HTML entities
     * @param txt
     * @returns {string}
     */
    showdown.helper.unescapeHTMLEntities = function (txt) {

      return txt
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    };

    var rgxFindMatchPos = function (str, left, right, flags) {
      var f = flags || '',
          g = f.indexOf('g') > -1,
          x = new RegExp(left + '|' + right, 'g' + f.replace(/g/g, '')),
          l = new RegExp(left, f.replace(/g/g, '')),
          pos = [],
          t, s, m, start, end;

      do {
        t = 0;
        while ((m = x.exec(str))) {
          if (l.test(m[0])) {
            if (!(t++)) {
              s = x.lastIndex;
              start = s - m[0].length;
            }
          } else if (t) {
            if (!--t) {
              end = m.index + m[0].length;
              var obj = {
                left: {start: start, end: s},
                match: {start: s, end: m.index},
                right: {start: m.index, end: end},
                wholeMatch: {start: start, end: end}
              };
              pos.push(obj);
              if (!g) {
                return pos;
              }
            }
          }
        }
      } while (t && (x.lastIndex = s));

      return pos;
    };

    /**
     * matchRecursiveRegExp
     *
     * (c) 2007 Steven Levithan <stevenlevithan.com>
     * MIT License
     *
     * Accepts a string to search, a left and right format delimiter
     * as regex patterns, and optional regex flags. Returns an array
     * of matches, allowing nested instances of left/right delimiters.
     * Use the "g" flag to return all matches, otherwise only the
     * first is returned. Be careful to ensure that the left and
     * right format delimiters produce mutually exclusive matches.
     * Backreferences are not supported within the right delimiter
     * due to how it is internally combined with the left delimiter.
     * When matching strings whose format delimiters are unbalanced
     * to the left or right, the output is intentionally as a
     * conventional regex library with recursion support would
     * produce, e.g. "<<x>" and "<x>>" both produce ["x"] when using
     * "<" and ">" as the delimiters (both strings contain a single,
     * balanced instance of "<x>").
     *
     * examples:
     * matchRecursiveRegExp("test", "\\(", "\\)")
     * returns: []
     * matchRecursiveRegExp("<t<<e>><s>>t<>", "<", ">", "g")
     * returns: ["t<<e>><s>", ""]
     * matchRecursiveRegExp("<div id=\"x\">test</div>", "<div\\b[^>]*>", "</div>", "gi")
     * returns: ["test"]
     */
    showdown.helper.matchRecursiveRegExp = function (str, left, right, flags) {

      var matchPos = rgxFindMatchPos (str, left, right, flags),
          results = [];

      for (var i = 0; i < matchPos.length; ++i) {
        results.push([
          str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
          str.slice(matchPos[i].match.start, matchPos[i].match.end),
          str.slice(matchPos[i].left.start, matchPos[i].left.end),
          str.slice(matchPos[i].right.start, matchPos[i].right.end)
        ]);
      }
      return results;
    };

    /**
     *
     * @param {string} str
     * @param {string|function} replacement
     * @param {string} left
     * @param {string} right
     * @param {string} flags
     * @returns {string}
     */
    showdown.helper.replaceRecursiveRegExp = function (str, replacement, left, right, flags) {

      if (!showdown.helper.isFunction(replacement)) {
        var repStr = replacement;
        replacement = function () {
          return repStr;
        };
      }

      var matchPos = rgxFindMatchPos(str, left, right, flags),
          finalStr = str,
          lng = matchPos.length;

      if (lng > 0) {
        var bits = [];
        if (matchPos[0].wholeMatch.start !== 0) {
          bits.push(str.slice(0, matchPos[0].wholeMatch.start));
        }
        for (var i = 0; i < lng; ++i) {
          bits.push(
            replacement(
              str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
              str.slice(matchPos[i].match.start, matchPos[i].match.end),
              str.slice(matchPos[i].left.start, matchPos[i].left.end),
              str.slice(matchPos[i].right.start, matchPos[i].right.end)
            )
          );
          if (i < lng - 1) {
            bits.push(str.slice(matchPos[i].wholeMatch.end, matchPos[i + 1].wholeMatch.start));
          }
        }
        if (matchPos[lng - 1].wholeMatch.end < str.length) {
          bits.push(str.slice(matchPos[lng - 1].wholeMatch.end));
        }
        finalStr = bits.join('');
      }
      return finalStr;
    };

    /**
     * Returns the index within the passed String object of the first occurrence of the specified regex,
     * starting the search at fromIndex. Returns -1 if the value is not found.
     *
     * @param {string} str string to search
     * @param {RegExp} regex Regular expression to search
     * @param {int} [fromIndex = 0] Index to start the search
     * @returns {Number}
     * @throws InvalidArgumentError
     */
    showdown.helper.regexIndexOf = function (str, regex, fromIndex) {
      if (!showdown.helper.isString(str)) {
        throw 'InvalidArgumentError: first parameter of showdown.helper.regexIndexOf function must be a string';
      }
      if (regex instanceof RegExp === false) {
        throw 'InvalidArgumentError: second parameter of showdown.helper.regexIndexOf function must be an instance of RegExp';
      }
      var indexOf = str.substring(fromIndex || 0).search(regex);
      return (indexOf >= 0) ? (indexOf + (fromIndex || 0)) : indexOf;
    };

    /**
     * Splits the passed string object at the defined index, and returns an array composed of the two substrings
     * @param {string} str string to split
     * @param {int} index index to split string at
     * @returns {[string,string]}
     * @throws InvalidArgumentError
     */
    showdown.helper.splitAtIndex = function (str, index) {
      if (!showdown.helper.isString(str)) {
        throw 'InvalidArgumentError: first parameter of showdown.helper.regexIndexOf function must be a string';
      }
      return [str.substring(0, index), str.substring(index)];
    };

    /**
     * Obfuscate an e-mail address through the use of Character Entities,
     * transforming ASCII characters into their equivalent decimal or hex entities.
     *
     * Since it has a random component, subsequent calls to this function produce different results
     *
     * @param {string} mail
     * @returns {string}
     */
    showdown.helper.encodeEmailAddress = function (mail) {
      var encode = [
        function (ch) {
          return '&#' + ch.charCodeAt(0) + ';';
        },
        function (ch) {
          return '&#x' + ch.charCodeAt(0).toString(16) + ';';
        },
        function (ch) {
          return ch;
        }
      ];

      mail = mail.replace(/./g, function (ch) {
        if (ch === '@') {
          // this *must* be encoded. I insist.
          ch = encode[Math.floor(Math.random() * 2)](ch);
        } else {
          var r = Math.random();
          // roughly 10% raw, 45% hex, 45% dec
          ch = (
            r > 0.9 ? encode[2](ch) : r > 0.45 ? encode[1](ch) : encode[0](ch)
          );
        }
        return ch;
      });

      return mail;
    };

    /**
     *
     * @param str
     * @param targetLength
     * @param padString
     * @returns {string}
     */
    showdown.helper.padEnd = function padEnd (str, targetLength, padString) {
      /*jshint bitwise: false*/
      // eslint-disable-next-line space-infix-ops
      targetLength = targetLength>>0; //floor if number or convert non-number to 0;
      /*jshint bitwise: true*/
      padString = String(padString || ' ');
      if (str.length > targetLength) {
        return String(str);
      } else {
        targetLength = targetLength - str.length;
        if (targetLength > padString.length) {
          padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
        }
        return String(str) + padString.slice(0,targetLength);
      }
    };

    /**
     * POLYFILLS
     */
    // use this instead of builtin is undefined for IE8 compatibility
    if (typeof console === 'undefined') {
      console = {
        warn: function (msg) {
          alert(msg);
        },
        log: function (msg) {
          alert(msg);
        },
        error: function (msg) {
          throw msg;
        }
      };
    }

    /**
     * Common regexes.
     * We declare some common regexes to improve performance
     */
    showdown.helper.regexes = {
      asteriskDashAndColon: /([*_:~])/g
    };

    /**
     * EMOJIS LIST
     */
    showdown.helper.emojis = {
      '+1':'\ud83d\udc4d',
      '-1':'\ud83d\udc4e',
      '100':'\ud83d\udcaf',
      '1234':'\ud83d\udd22',
      '1st_place_medal':'\ud83e\udd47',
      '2nd_place_medal':'\ud83e\udd48',
      '3rd_place_medal':'\ud83e\udd49',
      '8ball':'\ud83c\udfb1',
      'a':'\ud83c\udd70\ufe0f',
      'ab':'\ud83c\udd8e',
      'abc':'\ud83d\udd24',
      'abcd':'\ud83d\udd21',
      'accept':'\ud83c\ude51',
      'aerial_tramway':'\ud83d\udea1',
      'airplane':'\u2708\ufe0f',
      'alarm_clock':'\u23f0',
      'alembic':'\u2697\ufe0f',
      'alien':'\ud83d\udc7d',
      'ambulance':'\ud83d\ude91',
      'amphora':'\ud83c\udffa',
      'anchor':'\u2693\ufe0f',
      'angel':'\ud83d\udc7c',
      'anger':'\ud83d\udca2',
      'angry':'\ud83d\ude20',
      'anguished':'\ud83d\ude27',
      'ant':'\ud83d\udc1c',
      'apple':'\ud83c\udf4e',
      'aquarius':'\u2652\ufe0f',
      'aries':'\u2648\ufe0f',
      'arrow_backward':'\u25c0\ufe0f',
      'arrow_double_down':'\u23ec',
      'arrow_double_up':'\u23eb',
      'arrow_down':'\u2b07\ufe0f',
      'arrow_down_small':'\ud83d\udd3d',
      'arrow_forward':'\u25b6\ufe0f',
      'arrow_heading_down':'\u2935\ufe0f',
      'arrow_heading_up':'\u2934\ufe0f',
      'arrow_left':'\u2b05\ufe0f',
      'arrow_lower_left':'\u2199\ufe0f',
      'arrow_lower_right':'\u2198\ufe0f',
      'arrow_right':'\u27a1\ufe0f',
      'arrow_right_hook':'\u21aa\ufe0f',
      'arrow_up':'\u2b06\ufe0f',
      'arrow_up_down':'\u2195\ufe0f',
      'arrow_up_small':'\ud83d\udd3c',
      'arrow_upper_left':'\u2196\ufe0f',
      'arrow_upper_right':'\u2197\ufe0f',
      'arrows_clockwise':'\ud83d\udd03',
      'arrows_counterclockwise':'\ud83d\udd04',
      'art':'\ud83c\udfa8',
      'articulated_lorry':'\ud83d\ude9b',
      'artificial_satellite':'\ud83d\udef0',
      'astonished':'\ud83d\ude32',
      'athletic_shoe':'\ud83d\udc5f',
      'atm':'\ud83c\udfe7',
      'atom_symbol':'\u269b\ufe0f',
      'avocado':'\ud83e\udd51',
      'b':'\ud83c\udd71\ufe0f',
      'baby':'\ud83d\udc76',
      'baby_bottle':'\ud83c\udf7c',
      'baby_chick':'\ud83d\udc24',
      'baby_symbol':'\ud83d\udebc',
      'back':'\ud83d\udd19',
      'bacon':'\ud83e\udd53',
      'badminton':'\ud83c\udff8',
      'baggage_claim':'\ud83d\udec4',
      'baguette_bread':'\ud83e\udd56',
      'balance_scale':'\u2696\ufe0f',
      'balloon':'\ud83c\udf88',
      'ballot_box':'\ud83d\uddf3',
      'ballot_box_with_check':'\u2611\ufe0f',
      'bamboo':'\ud83c\udf8d',
      'banana':'\ud83c\udf4c',
      'bangbang':'\u203c\ufe0f',
      'bank':'\ud83c\udfe6',
      'bar_chart':'\ud83d\udcca',
      'barber':'\ud83d\udc88',
      'baseball':'\u26be\ufe0f',
      'basketball':'\ud83c\udfc0',
      'basketball_man':'\u26f9\ufe0f',
      'basketball_woman':'\u26f9\ufe0f&zwj;\u2640\ufe0f',
      'bat':'\ud83e\udd87',
      'bath':'\ud83d\udec0',
      'bathtub':'\ud83d\udec1',
      'battery':'\ud83d\udd0b',
      'beach_umbrella':'\ud83c\udfd6',
      'bear':'\ud83d\udc3b',
      'bed':'\ud83d\udecf',
      'bee':'\ud83d\udc1d',
      'beer':'\ud83c\udf7a',
      'beers':'\ud83c\udf7b',
      'beetle':'\ud83d\udc1e',
      'beginner':'\ud83d\udd30',
      'bell':'\ud83d\udd14',
      'bellhop_bell':'\ud83d\udece',
      'bento':'\ud83c\udf71',
      'biking_man':'\ud83d\udeb4',
      'bike':'\ud83d\udeb2',
      'biking_woman':'\ud83d\udeb4&zwj;\u2640\ufe0f',
      'bikini':'\ud83d\udc59',
      'biohazard':'\u2623\ufe0f',
      'bird':'\ud83d\udc26',
      'birthday':'\ud83c\udf82',
      'black_circle':'\u26ab\ufe0f',
      'black_flag':'\ud83c\udff4',
      'black_heart':'\ud83d\udda4',
      'black_joker':'\ud83c\udccf',
      'black_large_square':'\u2b1b\ufe0f',
      'black_medium_small_square':'\u25fe\ufe0f',
      'black_medium_square':'\u25fc\ufe0f',
      'black_nib':'\u2712\ufe0f',
      'black_small_square':'\u25aa\ufe0f',
      'black_square_button':'\ud83d\udd32',
      'blonde_man':'\ud83d\udc71',
      'blonde_woman':'\ud83d\udc71&zwj;\u2640\ufe0f',
      'blossom':'\ud83c\udf3c',
      'blowfish':'\ud83d\udc21',
      'blue_book':'\ud83d\udcd8',
      'blue_car':'\ud83d\ude99',
      'blue_heart':'\ud83d\udc99',
      'blush':'\ud83d\ude0a',
      'boar':'\ud83d\udc17',
      'boat':'\u26f5\ufe0f',
      'bomb':'\ud83d\udca3',
      'book':'\ud83d\udcd6',
      'bookmark':'\ud83d\udd16',
      'bookmark_tabs':'\ud83d\udcd1',
      'books':'\ud83d\udcda',
      'boom':'\ud83d\udca5',
      'boot':'\ud83d\udc62',
      'bouquet':'\ud83d\udc90',
      'bowing_man':'\ud83d\ude47',
      'bow_and_arrow':'\ud83c\udff9',
      'bowing_woman':'\ud83d\ude47&zwj;\u2640\ufe0f',
      'bowling':'\ud83c\udfb3',
      'boxing_glove':'\ud83e\udd4a',
      'boy':'\ud83d\udc66',
      'bread':'\ud83c\udf5e',
      'bride_with_veil':'\ud83d\udc70',
      'bridge_at_night':'\ud83c\udf09',
      'briefcase':'\ud83d\udcbc',
      'broken_heart':'\ud83d\udc94',
      'bug':'\ud83d\udc1b',
      'building_construction':'\ud83c\udfd7',
      'bulb':'\ud83d\udca1',
      'bullettrain_front':'\ud83d\ude85',
      'bullettrain_side':'\ud83d\ude84',
      'burrito':'\ud83c\udf2f',
      'bus':'\ud83d\ude8c',
      'business_suit_levitating':'\ud83d\udd74',
      'busstop':'\ud83d\ude8f',
      'bust_in_silhouette':'\ud83d\udc64',
      'busts_in_silhouette':'\ud83d\udc65',
      'butterfly':'\ud83e\udd8b',
      'cactus':'\ud83c\udf35',
      'cake':'\ud83c\udf70',
      'calendar':'\ud83d\udcc6',
      'call_me_hand':'\ud83e\udd19',
      'calling':'\ud83d\udcf2',
      'camel':'\ud83d\udc2b',
      'camera':'\ud83d\udcf7',
      'camera_flash':'\ud83d\udcf8',
      'camping':'\ud83c\udfd5',
      'cancer':'\u264b\ufe0f',
      'candle':'\ud83d\udd6f',
      'candy':'\ud83c\udf6c',
      'canoe':'\ud83d\udef6',
      'capital_abcd':'\ud83d\udd20',
      'capricorn':'\u2651\ufe0f',
      'car':'\ud83d\ude97',
      'card_file_box':'\ud83d\uddc3',
      'card_index':'\ud83d\udcc7',
      'card_index_dividers':'\ud83d\uddc2',
      'carousel_horse':'\ud83c\udfa0',
      'carrot':'\ud83e\udd55',
      'cat':'\ud83d\udc31',
      'cat2':'\ud83d\udc08',
      'cd':'\ud83d\udcbf',
      'chains':'\u26d3',
      'champagne':'\ud83c\udf7e',
      'chart':'\ud83d\udcb9',
      'chart_with_downwards_trend':'\ud83d\udcc9',
      'chart_with_upwards_trend':'\ud83d\udcc8',
      'checkered_flag':'\ud83c\udfc1',
      'cheese':'\ud83e\uddc0',
      'cherries':'\ud83c\udf52',
      'cherry_blossom':'\ud83c\udf38',
      'chestnut':'\ud83c\udf30',
      'chicken':'\ud83d\udc14',
      'children_crossing':'\ud83d\udeb8',
      'chipmunk':'\ud83d\udc3f',
      'chocolate_bar':'\ud83c\udf6b',
      'christmas_tree':'\ud83c\udf84',
      'church':'\u26ea\ufe0f',
      'cinema':'\ud83c\udfa6',
      'circus_tent':'\ud83c\udfaa',
      'city_sunrise':'\ud83c\udf07',
      'city_sunset':'\ud83c\udf06',
      'cityscape':'\ud83c\udfd9',
      'cl':'\ud83c\udd91',
      'clamp':'\ud83d\udddc',
      'clap':'\ud83d\udc4f',
      'clapper':'\ud83c\udfac',
      'classical_building':'\ud83c\udfdb',
      'clinking_glasses':'\ud83e\udd42',
      'clipboard':'\ud83d\udccb',
      'clock1':'\ud83d\udd50',
      'clock10':'\ud83d\udd59',
      'clock1030':'\ud83d\udd65',
      'clock11':'\ud83d\udd5a',
      'clock1130':'\ud83d\udd66',
      'clock12':'\ud83d\udd5b',
      'clock1230':'\ud83d\udd67',
      'clock130':'\ud83d\udd5c',
      'clock2':'\ud83d\udd51',
      'clock230':'\ud83d\udd5d',
      'clock3':'\ud83d\udd52',
      'clock330':'\ud83d\udd5e',
      'clock4':'\ud83d\udd53',
      'clock430':'\ud83d\udd5f',
      'clock5':'\ud83d\udd54',
      'clock530':'\ud83d\udd60',
      'clock6':'\ud83d\udd55',
      'clock630':'\ud83d\udd61',
      'clock7':'\ud83d\udd56',
      'clock730':'\ud83d\udd62',
      'clock8':'\ud83d\udd57',
      'clock830':'\ud83d\udd63',
      'clock9':'\ud83d\udd58',
      'clock930':'\ud83d\udd64',
      'closed_book':'\ud83d\udcd5',
      'closed_lock_with_key':'\ud83d\udd10',
      'closed_umbrella':'\ud83c\udf02',
      'cloud':'\u2601\ufe0f',
      'cloud_with_lightning':'\ud83c\udf29',
      'cloud_with_lightning_and_rain':'\u26c8',
      'cloud_with_rain':'\ud83c\udf27',
      'cloud_with_snow':'\ud83c\udf28',
      'clown_face':'\ud83e\udd21',
      'clubs':'\u2663\ufe0f',
      'cocktail':'\ud83c\udf78',
      'coffee':'\u2615\ufe0f',
      'coffin':'\u26b0\ufe0f',
      'cold_sweat':'\ud83d\ude30',
      'comet':'\u2604\ufe0f',
      'computer':'\ud83d\udcbb',
      'computer_mouse':'\ud83d\uddb1',
      'confetti_ball':'\ud83c\udf8a',
      'confounded':'\ud83d\ude16',
      'confused':'\ud83d\ude15',
      'congratulations':'\u3297\ufe0f',
      'construction':'\ud83d\udea7',
      'construction_worker_man':'\ud83d\udc77',
      'construction_worker_woman':'\ud83d\udc77&zwj;\u2640\ufe0f',
      'control_knobs':'\ud83c\udf9b',
      'convenience_store':'\ud83c\udfea',
      'cookie':'\ud83c\udf6a',
      'cool':'\ud83c\udd92',
      'policeman':'\ud83d\udc6e',
      'copyright':'\u00a9\ufe0f',
      'corn':'\ud83c\udf3d',
      'couch_and_lamp':'\ud83d\udecb',
      'couple':'\ud83d\udc6b',
      'couple_with_heart_woman_man':'\ud83d\udc91',
      'couple_with_heart_man_man':'\ud83d\udc68&zwj;\u2764\ufe0f&zwj;\ud83d\udc68',
      'couple_with_heart_woman_woman':'\ud83d\udc69&zwj;\u2764\ufe0f&zwj;\ud83d\udc69',
      'couplekiss_man_man':'\ud83d\udc68&zwj;\u2764\ufe0f&zwj;\ud83d\udc8b&zwj;\ud83d\udc68',
      'couplekiss_man_woman':'\ud83d\udc8f',
      'couplekiss_woman_woman':'\ud83d\udc69&zwj;\u2764\ufe0f&zwj;\ud83d\udc8b&zwj;\ud83d\udc69',
      'cow':'\ud83d\udc2e',
      'cow2':'\ud83d\udc04',
      'cowboy_hat_face':'\ud83e\udd20',
      'crab':'\ud83e\udd80',
      'crayon':'\ud83d\udd8d',
      'credit_card':'\ud83d\udcb3',
      'crescent_moon':'\ud83c\udf19',
      'cricket':'\ud83c\udfcf',
      'crocodile':'\ud83d\udc0a',
      'croissant':'\ud83e\udd50',
      'crossed_fingers':'\ud83e\udd1e',
      'crossed_flags':'\ud83c\udf8c',
      'crossed_swords':'\u2694\ufe0f',
      'crown':'\ud83d\udc51',
      'cry':'\ud83d\ude22',
      'crying_cat_face':'\ud83d\ude3f',
      'crystal_ball':'\ud83d\udd2e',
      'cucumber':'\ud83e\udd52',
      'cupid':'\ud83d\udc98',
      'curly_loop':'\u27b0',
      'currency_exchange':'\ud83d\udcb1',
      'curry':'\ud83c\udf5b',
      'custard':'\ud83c\udf6e',
      'customs':'\ud83d\udec3',
      'cyclone':'\ud83c\udf00',
      'dagger':'\ud83d\udde1',
      'dancer':'\ud83d\udc83',
      'dancing_women':'\ud83d\udc6f',
      'dancing_men':'\ud83d\udc6f&zwj;\u2642\ufe0f',
      'dango':'\ud83c\udf61',
      'dark_sunglasses':'\ud83d\udd76',
      'dart':'\ud83c\udfaf',
      'dash':'\ud83d\udca8',
      'date':'\ud83d\udcc5',
      'deciduous_tree':'\ud83c\udf33',
      'deer':'\ud83e\udd8c',
      'department_store':'\ud83c\udfec',
      'derelict_house':'\ud83c\udfda',
      'desert':'\ud83c\udfdc',
      'desert_island':'\ud83c\udfdd',
      'desktop_computer':'\ud83d\udda5',
      'male_detective':'\ud83d\udd75\ufe0f',
      'diamond_shape_with_a_dot_inside':'\ud83d\udca0',
      'diamonds':'\u2666\ufe0f',
      'disappointed':'\ud83d\ude1e',
      'disappointed_relieved':'\ud83d\ude25',
      'dizzy':'\ud83d\udcab',
      'dizzy_face':'\ud83d\ude35',
      'do_not_litter':'\ud83d\udeaf',
      'dog':'\ud83d\udc36',
      'dog2':'\ud83d\udc15',
      'dollar':'\ud83d\udcb5',
      'dolls':'\ud83c\udf8e',
      'dolphin':'\ud83d\udc2c',
      'door':'\ud83d\udeaa',
      'doughnut':'\ud83c\udf69',
      'dove':'\ud83d\udd4a',
      'dragon':'\ud83d\udc09',
      'dragon_face':'\ud83d\udc32',
      'dress':'\ud83d\udc57',
      'dromedary_camel':'\ud83d\udc2a',
      'drooling_face':'\ud83e\udd24',
      'droplet':'\ud83d\udca7',
      'drum':'\ud83e\udd41',
      'duck':'\ud83e\udd86',
      'dvd':'\ud83d\udcc0',
      'e-mail':'\ud83d\udce7',
      'eagle':'\ud83e\udd85',
      'ear':'\ud83d\udc42',
      'ear_of_rice':'\ud83c\udf3e',
      'earth_africa':'\ud83c\udf0d',
      'earth_americas':'\ud83c\udf0e',
      'earth_asia':'\ud83c\udf0f',
      'egg':'\ud83e\udd5a',
      'eggplant':'\ud83c\udf46',
      'eight_pointed_black_star':'\u2734\ufe0f',
      'eight_spoked_asterisk':'\u2733\ufe0f',
      'electric_plug':'\ud83d\udd0c',
      'elephant':'\ud83d\udc18',
      'email':'\u2709\ufe0f',
      'end':'\ud83d\udd1a',
      'envelope_with_arrow':'\ud83d\udce9',
      'euro':'\ud83d\udcb6',
      'european_castle':'\ud83c\udff0',
      'european_post_office':'\ud83c\udfe4',
      'evergreen_tree':'\ud83c\udf32',
      'exclamation':'\u2757\ufe0f',
      'expressionless':'\ud83d\ude11',
      'eye':'\ud83d\udc41',
      'eye_speech_bubble':'\ud83d\udc41&zwj;\ud83d\udde8',
      'eyeglasses':'\ud83d\udc53',
      'eyes':'\ud83d\udc40',
      'face_with_head_bandage':'\ud83e\udd15',
      'face_with_thermometer':'\ud83e\udd12',
      'fist_oncoming':'\ud83d\udc4a',
      'factory':'\ud83c\udfed',
      'fallen_leaf':'\ud83c\udf42',
      'family_man_woman_boy':'\ud83d\udc6a',
      'family_man_boy':'\ud83d\udc68&zwj;\ud83d\udc66',
      'family_man_boy_boy':'\ud83d\udc68&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
      'family_man_girl':'\ud83d\udc68&zwj;\ud83d\udc67',
      'family_man_girl_boy':'\ud83d\udc68&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
      'family_man_girl_girl':'\ud83d\udc68&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
      'family_man_man_boy':'\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc66',
      'family_man_man_boy_boy':'\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
      'family_man_man_girl':'\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc67',
      'family_man_man_girl_boy':'\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
      'family_man_man_girl_girl':'\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
      'family_man_woman_boy_boy':'\ud83d\udc68&zwj;\ud83d\udc69&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
      'family_man_woman_girl':'\ud83d\udc68&zwj;\ud83d\udc69&zwj;\ud83d\udc67',
      'family_man_woman_girl_boy':'\ud83d\udc68&zwj;\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
      'family_man_woman_girl_girl':'\ud83d\udc68&zwj;\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
      'family_woman_boy':'\ud83d\udc69&zwj;\ud83d\udc66',
      'family_woman_boy_boy':'\ud83d\udc69&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
      'family_woman_girl':'\ud83d\udc69&zwj;\ud83d\udc67',
      'family_woman_girl_boy':'\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
      'family_woman_girl_girl':'\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
      'family_woman_woman_boy':'\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc66',
      'family_woman_woman_boy_boy':'\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
      'family_woman_woman_girl':'\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc67',
      'family_woman_woman_girl_boy':'\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
      'family_woman_woman_girl_girl':'\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
      'fast_forward':'\u23e9',
      'fax':'\ud83d\udce0',
      'fearful':'\ud83d\ude28',
      'feet':'\ud83d\udc3e',
      'female_detective':'\ud83d\udd75\ufe0f&zwj;\u2640\ufe0f',
      'ferris_wheel':'\ud83c\udfa1',
      'ferry':'\u26f4',
      'field_hockey':'\ud83c\udfd1',
      'file_cabinet':'\ud83d\uddc4',
      'file_folder':'\ud83d\udcc1',
      'film_projector':'\ud83d\udcfd',
      'film_strip':'\ud83c\udf9e',
      'fire':'\ud83d\udd25',
      'fire_engine':'\ud83d\ude92',
      'fireworks':'\ud83c\udf86',
      'first_quarter_moon':'\ud83c\udf13',
      'first_quarter_moon_with_face':'\ud83c\udf1b',
      'fish':'\ud83d\udc1f',
      'fish_cake':'\ud83c\udf65',
      'fishing_pole_and_fish':'\ud83c\udfa3',
      'fist_raised':'\u270a',
      'fist_left':'\ud83e\udd1b',
      'fist_right':'\ud83e\udd1c',
      'flags':'\ud83c\udf8f',
      'flashlight':'\ud83d\udd26',
      'fleur_de_lis':'\u269c\ufe0f',
      'flight_arrival':'\ud83d\udeec',
      'flight_departure':'\ud83d\udeeb',
      'floppy_disk':'\ud83d\udcbe',
      'flower_playing_cards':'\ud83c\udfb4',
      'flushed':'\ud83d\ude33',
      'fog':'\ud83c\udf2b',
      'foggy':'\ud83c\udf01',
      'football':'\ud83c\udfc8',
      'footprints':'\ud83d\udc63',
      'fork_and_knife':'\ud83c\udf74',
      'fountain':'\u26f2\ufe0f',
      'fountain_pen':'\ud83d\udd8b',
      'four_leaf_clover':'\ud83c\udf40',
      'fox_face':'\ud83e\udd8a',
      'framed_picture':'\ud83d\uddbc',
      'free':'\ud83c\udd93',
      'fried_egg':'\ud83c\udf73',
      'fried_shrimp':'\ud83c\udf64',
      'fries':'\ud83c\udf5f',
      'frog':'\ud83d\udc38',
      'frowning':'\ud83d\ude26',
      'frowning_face':'\u2639\ufe0f',
      'frowning_man':'\ud83d\ude4d&zwj;\u2642\ufe0f',
      'frowning_woman':'\ud83d\ude4d',
      'middle_finger':'\ud83d\udd95',
      'fuelpump':'\u26fd\ufe0f',
      'full_moon':'\ud83c\udf15',
      'full_moon_with_face':'\ud83c\udf1d',
      'funeral_urn':'\u26b1\ufe0f',
      'game_die':'\ud83c\udfb2',
      'gear':'\u2699\ufe0f',
      'gem':'\ud83d\udc8e',
      'gemini':'\u264a\ufe0f',
      'ghost':'\ud83d\udc7b',
      'gift':'\ud83c\udf81',
      'gift_heart':'\ud83d\udc9d',
      'girl':'\ud83d\udc67',
      'globe_with_meridians':'\ud83c\udf10',
      'goal_net':'\ud83e\udd45',
      'goat':'\ud83d\udc10',
      'golf':'\u26f3\ufe0f',
      'golfing_man':'\ud83c\udfcc\ufe0f',
      'golfing_woman':'\ud83c\udfcc\ufe0f&zwj;\u2640\ufe0f',
      'gorilla':'\ud83e\udd8d',
      'grapes':'\ud83c\udf47',
      'green_apple':'\ud83c\udf4f',
      'green_book':'\ud83d\udcd7',
      'green_heart':'\ud83d\udc9a',
      'green_salad':'\ud83e\udd57',
      'grey_exclamation':'\u2755',
      'grey_question':'\u2754',
      'grimacing':'\ud83d\ude2c',
      'grin':'\ud83d\ude01',
      'grinning':'\ud83d\ude00',
      'guardsman':'\ud83d\udc82',
      'guardswoman':'\ud83d\udc82&zwj;\u2640\ufe0f',
      'guitar':'\ud83c\udfb8',
      'gun':'\ud83d\udd2b',
      'haircut_woman':'\ud83d\udc87',
      'haircut_man':'\ud83d\udc87&zwj;\u2642\ufe0f',
      'hamburger':'\ud83c\udf54',
      'hammer':'\ud83d\udd28',
      'hammer_and_pick':'\u2692',
      'hammer_and_wrench':'\ud83d\udee0',
      'hamster':'\ud83d\udc39',
      'hand':'\u270b',
      'handbag':'\ud83d\udc5c',
      'handshake':'\ud83e\udd1d',
      'hankey':'\ud83d\udca9',
      'hatched_chick':'\ud83d\udc25',
      'hatching_chick':'\ud83d\udc23',
      'headphones':'\ud83c\udfa7',
      'hear_no_evil':'\ud83d\ude49',
      'heart':'\u2764\ufe0f',
      'heart_decoration':'\ud83d\udc9f',
      'heart_eyes':'\ud83d\ude0d',
      'heart_eyes_cat':'\ud83d\ude3b',
      'heartbeat':'\ud83d\udc93',
      'heartpulse':'\ud83d\udc97',
      'hearts':'\u2665\ufe0f',
      'heavy_check_mark':'\u2714\ufe0f',
      'heavy_division_sign':'\u2797',
      'heavy_dollar_sign':'\ud83d\udcb2',
      'heavy_heart_exclamation':'\u2763\ufe0f',
      'heavy_minus_sign':'\u2796',
      'heavy_multiplication_x':'\u2716\ufe0f',
      'heavy_plus_sign':'\u2795',
      'helicopter':'\ud83d\ude81',
      'herb':'\ud83c\udf3f',
      'hibiscus':'\ud83c\udf3a',
      'high_brightness':'\ud83d\udd06',
      'high_heel':'\ud83d\udc60',
      'hocho':'\ud83d\udd2a',
      'hole':'\ud83d\udd73',
      'honey_pot':'\ud83c\udf6f',
      'horse':'\ud83d\udc34',
      'horse_racing':'\ud83c\udfc7',
      'hospital':'\ud83c\udfe5',
      'hot_pepper':'\ud83c\udf36',
      'hotdog':'\ud83c\udf2d',
      'hotel':'\ud83c\udfe8',
      'hotsprings':'\u2668\ufe0f',
      'hourglass':'\u231b\ufe0f',
      'hourglass_flowing_sand':'\u23f3',
      'house':'\ud83c\udfe0',
      'house_with_garden':'\ud83c\udfe1',
      'houses':'\ud83c\udfd8',
      'hugs':'\ud83e\udd17',
      'hushed':'\ud83d\ude2f',
      'ice_cream':'\ud83c\udf68',
      'ice_hockey':'\ud83c\udfd2',
      'ice_skate':'\u26f8',
      'icecream':'\ud83c\udf66',
      'id':'\ud83c\udd94',
      'ideograph_advantage':'\ud83c\ude50',
      'imp':'\ud83d\udc7f',
      'inbox_tray':'\ud83d\udce5',
      'incoming_envelope':'\ud83d\udce8',
      'tipping_hand_woman':'\ud83d\udc81',
      'information_source':'\u2139\ufe0f',
      'innocent':'\ud83d\ude07',
      'interrobang':'\u2049\ufe0f',
      'iphone':'\ud83d\udcf1',
      'izakaya_lantern':'\ud83c\udfee',
      'jack_o_lantern':'\ud83c\udf83',
      'japan':'\ud83d\uddfe',
      'japanese_castle':'\ud83c\udfef',
      'japanese_goblin':'\ud83d\udc7a',
      'japanese_ogre':'\ud83d\udc79',
      'jeans':'\ud83d\udc56',
      'joy':'\ud83d\ude02',
      'joy_cat':'\ud83d\ude39',
      'joystick':'\ud83d\udd79',
      'kaaba':'\ud83d\udd4b',
      'key':'\ud83d\udd11',
      'keyboard':'\u2328\ufe0f',
      'keycap_ten':'\ud83d\udd1f',
      'kick_scooter':'\ud83d\udef4',
      'kimono':'\ud83d\udc58',
      'kiss':'\ud83d\udc8b',
      'kissing':'\ud83d\ude17',
      'kissing_cat':'\ud83d\ude3d',
      'kissing_closed_eyes':'\ud83d\ude1a',
      'kissing_heart':'\ud83d\ude18',
      'kissing_smiling_eyes':'\ud83d\ude19',
      'kiwi_fruit':'\ud83e\udd5d',
      'koala':'\ud83d\udc28',
      'koko':'\ud83c\ude01',
      'label':'\ud83c\udff7',
      'large_blue_circle':'\ud83d\udd35',
      'large_blue_diamond':'\ud83d\udd37',
      'large_orange_diamond':'\ud83d\udd36',
      'last_quarter_moon':'\ud83c\udf17',
      'last_quarter_moon_with_face':'\ud83c\udf1c',
      'latin_cross':'\u271d\ufe0f',
      'laughing':'\ud83d\ude06',
      'leaves':'\ud83c\udf43',
      'ledger':'\ud83d\udcd2',
      'left_luggage':'\ud83d\udec5',
      'left_right_arrow':'\u2194\ufe0f',
      'leftwards_arrow_with_hook':'\u21a9\ufe0f',
      'lemon':'\ud83c\udf4b',
      'leo':'\u264c\ufe0f',
      'leopard':'\ud83d\udc06',
      'level_slider':'\ud83c\udf9a',
      'libra':'\u264e\ufe0f',
      'light_rail':'\ud83d\ude88',
      'link':'\ud83d\udd17',
      'lion':'\ud83e\udd81',
      'lips':'\ud83d\udc44',
      'lipstick':'\ud83d\udc84',
      'lizard':'\ud83e\udd8e',
      'lock':'\ud83d\udd12',
      'lock_with_ink_pen':'\ud83d\udd0f',
      'lollipop':'\ud83c\udf6d',
      'loop':'\u27bf',
      'loud_sound':'\ud83d\udd0a',
      'loudspeaker':'\ud83d\udce2',
      'love_hotel':'\ud83c\udfe9',
      'love_letter':'\ud83d\udc8c',
      'low_brightness':'\ud83d\udd05',
      'lying_face':'\ud83e\udd25',
      'm':'\u24c2\ufe0f',
      'mag':'\ud83d\udd0d',
      'mag_right':'\ud83d\udd0e',
      'mahjong':'\ud83c\udc04\ufe0f',
      'mailbox':'\ud83d\udceb',
      'mailbox_closed':'\ud83d\udcea',
      'mailbox_with_mail':'\ud83d\udcec',
      'mailbox_with_no_mail':'\ud83d\udced',
      'man':'\ud83d\udc68',
      'man_artist':'\ud83d\udc68&zwj;\ud83c\udfa8',
      'man_astronaut':'\ud83d\udc68&zwj;\ud83d\ude80',
      'man_cartwheeling':'\ud83e\udd38&zwj;\u2642\ufe0f',
      'man_cook':'\ud83d\udc68&zwj;\ud83c\udf73',
      'man_dancing':'\ud83d\udd7a',
      'man_facepalming':'\ud83e\udd26&zwj;\u2642\ufe0f',
      'man_factory_worker':'\ud83d\udc68&zwj;\ud83c\udfed',
      'man_farmer':'\ud83d\udc68&zwj;\ud83c\udf3e',
      'man_firefighter':'\ud83d\udc68&zwj;\ud83d\ude92',
      'man_health_worker':'\ud83d\udc68&zwj;\u2695\ufe0f',
      'man_in_tuxedo':'\ud83e\udd35',
      'man_judge':'\ud83d\udc68&zwj;\u2696\ufe0f',
      'man_juggling':'\ud83e\udd39&zwj;\u2642\ufe0f',
      'man_mechanic':'\ud83d\udc68&zwj;\ud83d\udd27',
      'man_office_worker':'\ud83d\udc68&zwj;\ud83d\udcbc',
      'man_pilot':'\ud83d\udc68&zwj;\u2708\ufe0f',
      'man_playing_handball':'\ud83e\udd3e&zwj;\u2642\ufe0f',
      'man_playing_water_polo':'\ud83e\udd3d&zwj;\u2642\ufe0f',
      'man_scientist':'\ud83d\udc68&zwj;\ud83d\udd2c',
      'man_shrugging':'\ud83e\udd37&zwj;\u2642\ufe0f',
      'man_singer':'\ud83d\udc68&zwj;\ud83c\udfa4',
      'man_student':'\ud83d\udc68&zwj;\ud83c\udf93',
      'man_teacher':'\ud83d\udc68&zwj;\ud83c\udfeb',
      'man_technologist':'\ud83d\udc68&zwj;\ud83d\udcbb',
      'man_with_gua_pi_mao':'\ud83d\udc72',
      'man_with_turban':'\ud83d\udc73',
      'tangerine':'\ud83c\udf4a',
      'mans_shoe':'\ud83d\udc5e',
      'mantelpiece_clock':'\ud83d\udd70',
      'maple_leaf':'\ud83c\udf41',
      'martial_arts_uniform':'\ud83e\udd4b',
      'mask':'\ud83d\ude37',
      'massage_woman':'\ud83d\udc86',
      'massage_man':'\ud83d\udc86&zwj;\u2642\ufe0f',
      'meat_on_bone':'\ud83c\udf56',
      'medal_military':'\ud83c\udf96',
      'medal_sports':'\ud83c\udfc5',
      'mega':'\ud83d\udce3',
      'melon':'\ud83c\udf48',
      'memo':'\ud83d\udcdd',
      'men_wrestling':'\ud83e\udd3c&zwj;\u2642\ufe0f',
      'menorah':'\ud83d\udd4e',
      'mens':'\ud83d\udeb9',
      'metal':'\ud83e\udd18',
      'metro':'\ud83d\ude87',
      'microphone':'\ud83c\udfa4',
      'microscope':'\ud83d\udd2c',
      'milk_glass':'\ud83e\udd5b',
      'milky_way':'\ud83c\udf0c',
      'minibus':'\ud83d\ude90',
      'minidisc':'\ud83d\udcbd',
      'mobile_phone_off':'\ud83d\udcf4',
      'money_mouth_face':'\ud83e\udd11',
      'money_with_wings':'\ud83d\udcb8',
      'moneybag':'\ud83d\udcb0',
      'monkey':'\ud83d\udc12',
      'monkey_face':'\ud83d\udc35',
      'monorail':'\ud83d\ude9d',
      'moon':'\ud83c\udf14',
      'mortar_board':'\ud83c\udf93',
      'mosque':'\ud83d\udd4c',
      'motor_boat':'\ud83d\udee5',
      'motor_scooter':'\ud83d\udef5',
      'motorcycle':'\ud83c\udfcd',
      'motorway':'\ud83d\udee3',
      'mount_fuji':'\ud83d\uddfb',
      'mountain':'\u26f0',
      'mountain_biking_man':'\ud83d\udeb5',
      'mountain_biking_woman':'\ud83d\udeb5&zwj;\u2640\ufe0f',
      'mountain_cableway':'\ud83d\udea0',
      'mountain_railway':'\ud83d\ude9e',
      'mountain_snow':'\ud83c\udfd4',
      'mouse':'\ud83d\udc2d',
      'mouse2':'\ud83d\udc01',
      'movie_camera':'\ud83c\udfa5',
      'moyai':'\ud83d\uddff',
      'mrs_claus':'\ud83e\udd36',
      'muscle':'\ud83d\udcaa',
      'mushroom':'\ud83c\udf44',
      'musical_keyboard':'\ud83c\udfb9',
      'musical_note':'\ud83c\udfb5',
      'musical_score':'\ud83c\udfbc',
      'mute':'\ud83d\udd07',
      'nail_care':'\ud83d\udc85',
      'name_badge':'\ud83d\udcdb',
      'national_park':'\ud83c\udfde',
      'nauseated_face':'\ud83e\udd22',
      'necktie':'\ud83d\udc54',
      'negative_squared_cross_mark':'\u274e',
      'nerd_face':'\ud83e\udd13',
      'neutral_face':'\ud83d\ude10',
      'new':'\ud83c\udd95',
      'new_moon':'\ud83c\udf11',
      'new_moon_with_face':'\ud83c\udf1a',
      'newspaper':'\ud83d\udcf0',
      'newspaper_roll':'\ud83d\uddde',
      'next_track_button':'\u23ed',
      'ng':'\ud83c\udd96',
      'no_good_man':'\ud83d\ude45&zwj;\u2642\ufe0f',
      'no_good_woman':'\ud83d\ude45',
      'night_with_stars':'\ud83c\udf03',
      'no_bell':'\ud83d\udd15',
      'no_bicycles':'\ud83d\udeb3',
      'no_entry':'\u26d4\ufe0f',
      'no_entry_sign':'\ud83d\udeab',
      'no_mobile_phones':'\ud83d\udcf5',
      'no_mouth':'\ud83d\ude36',
      'no_pedestrians':'\ud83d\udeb7',
      'no_smoking':'\ud83d\udead',
      'non-potable_water':'\ud83d\udeb1',
      'nose':'\ud83d\udc43',
      'notebook':'\ud83d\udcd3',
      'notebook_with_decorative_cover':'\ud83d\udcd4',
      'notes':'\ud83c\udfb6',
      'nut_and_bolt':'\ud83d\udd29',
      'o':'\u2b55\ufe0f',
      'o2':'\ud83c\udd7e\ufe0f',
      'ocean':'\ud83c\udf0a',
      'octopus':'\ud83d\udc19',
      'oden':'\ud83c\udf62',
      'office':'\ud83c\udfe2',
      'oil_drum':'\ud83d\udee2',
      'ok':'\ud83c\udd97',
      'ok_hand':'\ud83d\udc4c',
      'ok_man':'\ud83d\ude46&zwj;\u2642\ufe0f',
      'ok_woman':'\ud83d\ude46',
      'old_key':'\ud83d\udddd',
      'older_man':'\ud83d\udc74',
      'older_woman':'\ud83d\udc75',
      'om':'\ud83d\udd49',
      'on':'\ud83d\udd1b',
      'oncoming_automobile':'\ud83d\ude98',
      'oncoming_bus':'\ud83d\ude8d',
      'oncoming_police_car':'\ud83d\ude94',
      'oncoming_taxi':'\ud83d\ude96',
      'open_file_folder':'\ud83d\udcc2',
      'open_hands':'\ud83d\udc50',
      'open_mouth':'\ud83d\ude2e',
      'open_umbrella':'\u2602\ufe0f',
      'ophiuchus':'\u26ce',
      'orange_book':'\ud83d\udcd9',
      'orthodox_cross':'\u2626\ufe0f',
      'outbox_tray':'\ud83d\udce4',
      'owl':'\ud83e\udd89',
      'ox':'\ud83d\udc02',
      'package':'\ud83d\udce6',
      'page_facing_up':'\ud83d\udcc4',
      'page_with_curl':'\ud83d\udcc3',
      'pager':'\ud83d\udcdf',
      'paintbrush':'\ud83d\udd8c',
      'palm_tree':'\ud83c\udf34',
      'pancakes':'\ud83e\udd5e',
      'panda_face':'\ud83d\udc3c',
      'paperclip':'\ud83d\udcce',
      'paperclips':'\ud83d\udd87',
      'parasol_on_ground':'\u26f1',
      'parking':'\ud83c\udd7f\ufe0f',
      'part_alternation_mark':'\u303d\ufe0f',
      'partly_sunny':'\u26c5\ufe0f',
      'passenger_ship':'\ud83d\udef3',
      'passport_control':'\ud83d\udec2',
      'pause_button':'\u23f8',
      'peace_symbol':'\u262e\ufe0f',
      'peach':'\ud83c\udf51',
      'peanuts':'\ud83e\udd5c',
      'pear':'\ud83c\udf50',
      'pen':'\ud83d\udd8a',
      'pencil2':'\u270f\ufe0f',
      'penguin':'\ud83d\udc27',
      'pensive':'\ud83d\ude14',
      'performing_arts':'\ud83c\udfad',
      'persevere':'\ud83d\ude23',
      'person_fencing':'\ud83e\udd3a',
      'pouting_woman':'\ud83d\ude4e',
      'phone':'\u260e\ufe0f',
      'pick':'\u26cf',
      'pig':'\ud83d\udc37',
      'pig2':'\ud83d\udc16',
      'pig_nose':'\ud83d\udc3d',
      'pill':'\ud83d\udc8a',
      'pineapple':'\ud83c\udf4d',
      'ping_pong':'\ud83c\udfd3',
      'pisces':'\u2653\ufe0f',
      'pizza':'\ud83c\udf55',
      'place_of_worship':'\ud83d\uded0',
      'plate_with_cutlery':'\ud83c\udf7d',
      'play_or_pause_button':'\u23ef',
      'point_down':'\ud83d\udc47',
      'point_left':'\ud83d\udc48',
      'point_right':'\ud83d\udc49',
      'point_up':'\u261d\ufe0f',
      'point_up_2':'\ud83d\udc46',
      'police_car':'\ud83d\ude93',
      'policewoman':'\ud83d\udc6e&zwj;\u2640\ufe0f',
      'poodle':'\ud83d\udc29',
      'popcorn':'\ud83c\udf7f',
      'post_office':'\ud83c\udfe3',
      'postal_horn':'\ud83d\udcef',
      'postbox':'\ud83d\udcee',
      'potable_water':'\ud83d\udeb0',
      'potato':'\ud83e\udd54',
      'pouch':'\ud83d\udc5d',
      'poultry_leg':'\ud83c\udf57',
      'pound':'\ud83d\udcb7',
      'rage':'\ud83d\ude21',
      'pouting_cat':'\ud83d\ude3e',
      'pouting_man':'\ud83d\ude4e&zwj;\u2642\ufe0f',
      'pray':'\ud83d\ude4f',
      'prayer_beads':'\ud83d\udcff',
      'pregnant_woman':'\ud83e\udd30',
      'previous_track_button':'\u23ee',
      'prince':'\ud83e\udd34',
      'princess':'\ud83d\udc78',
      'printer':'\ud83d\udda8',
      'purple_heart':'\ud83d\udc9c',
      'purse':'\ud83d\udc5b',
      'pushpin':'\ud83d\udccc',
      'put_litter_in_its_place':'\ud83d\udeae',
      'question':'\u2753',
      'rabbit':'\ud83d\udc30',
      'rabbit2':'\ud83d\udc07',
      'racehorse':'\ud83d\udc0e',
      'racing_car':'\ud83c\udfce',
      'radio':'\ud83d\udcfb',
      'radio_button':'\ud83d\udd18',
      'radioactive':'\u2622\ufe0f',
      'railway_car':'\ud83d\ude83',
      'railway_track':'\ud83d\udee4',
      'rainbow':'\ud83c\udf08',
      'rainbow_flag':'\ud83c\udff3\ufe0f&zwj;\ud83c\udf08',
      'raised_back_of_hand':'\ud83e\udd1a',
      'raised_hand_with_fingers_splayed':'\ud83d\udd90',
      'raised_hands':'\ud83d\ude4c',
      'raising_hand_woman':'\ud83d\ude4b',
      'raising_hand_man':'\ud83d\ude4b&zwj;\u2642\ufe0f',
      'ram':'\ud83d\udc0f',
      'ramen':'\ud83c\udf5c',
      'rat':'\ud83d\udc00',
      'record_button':'\u23fa',
      'recycle':'\u267b\ufe0f',
      'red_circle':'\ud83d\udd34',
      'registered':'\u00ae\ufe0f',
      'relaxed':'\u263a\ufe0f',
      'relieved':'\ud83d\ude0c',
      'reminder_ribbon':'\ud83c\udf97',
      'repeat':'\ud83d\udd01',
      'repeat_one':'\ud83d\udd02',
      'rescue_worker_helmet':'\u26d1',
      'restroom':'\ud83d\udebb',
      'revolving_hearts':'\ud83d\udc9e',
      'rewind':'\u23ea',
      'rhinoceros':'\ud83e\udd8f',
      'ribbon':'\ud83c\udf80',
      'rice':'\ud83c\udf5a',
      'rice_ball':'\ud83c\udf59',
      'rice_cracker':'\ud83c\udf58',
      'rice_scene':'\ud83c\udf91',
      'right_anger_bubble':'\ud83d\uddef',
      'ring':'\ud83d\udc8d',
      'robot':'\ud83e\udd16',
      'rocket':'\ud83d\ude80',
      'rofl':'\ud83e\udd23',
      'roll_eyes':'\ud83d\ude44',
      'roller_coaster':'\ud83c\udfa2',
      'rooster':'\ud83d\udc13',
      'rose':'\ud83c\udf39',
      'rosette':'\ud83c\udff5',
      'rotating_light':'\ud83d\udea8',
      'round_pushpin':'\ud83d\udccd',
      'rowing_man':'\ud83d\udea3',
      'rowing_woman':'\ud83d\udea3&zwj;\u2640\ufe0f',
      'rugby_football':'\ud83c\udfc9',
      'running_man':'\ud83c\udfc3',
      'running_shirt_with_sash':'\ud83c\udfbd',
      'running_woman':'\ud83c\udfc3&zwj;\u2640\ufe0f',
      'sa':'\ud83c\ude02\ufe0f',
      'sagittarius':'\u2650\ufe0f',
      'sake':'\ud83c\udf76',
      'sandal':'\ud83d\udc61',
      'santa':'\ud83c\udf85',
      'satellite':'\ud83d\udce1',
      'saxophone':'\ud83c\udfb7',
      'school':'\ud83c\udfeb',
      'school_satchel':'\ud83c\udf92',
      'scissors':'\u2702\ufe0f',
      'scorpion':'\ud83e\udd82',
      'scorpius':'\u264f\ufe0f',
      'scream':'\ud83d\ude31',
      'scream_cat':'\ud83d\ude40',
      'scroll':'\ud83d\udcdc',
      'seat':'\ud83d\udcba',
      'secret':'\u3299\ufe0f',
      'see_no_evil':'\ud83d\ude48',
      'seedling':'\ud83c\udf31',
      'selfie':'\ud83e\udd33',
      'shallow_pan_of_food':'\ud83e\udd58',
      'shamrock':'\u2618\ufe0f',
      'shark':'\ud83e\udd88',
      'shaved_ice':'\ud83c\udf67',
      'sheep':'\ud83d\udc11',
      'shell':'\ud83d\udc1a',
      'shield':'\ud83d\udee1',
      'shinto_shrine':'\u26e9',
      'ship':'\ud83d\udea2',
      'shirt':'\ud83d\udc55',
      'shopping':'\ud83d\udecd',
      'shopping_cart':'\ud83d\uded2',
      'shower':'\ud83d\udebf',
      'shrimp':'\ud83e\udd90',
      'signal_strength':'\ud83d\udcf6',
      'six_pointed_star':'\ud83d\udd2f',
      'ski':'\ud83c\udfbf',
      'skier':'\u26f7',
      'skull':'\ud83d\udc80',
      'skull_and_crossbones':'\u2620\ufe0f',
      'sleeping':'\ud83d\ude34',
      'sleeping_bed':'\ud83d\udecc',
      'sleepy':'\ud83d\ude2a',
      'slightly_frowning_face':'\ud83d\ude41',
      'slightly_smiling_face':'\ud83d\ude42',
      'slot_machine':'\ud83c\udfb0',
      'small_airplane':'\ud83d\udee9',
      'small_blue_diamond':'\ud83d\udd39',
      'small_orange_diamond':'\ud83d\udd38',
      'small_red_triangle':'\ud83d\udd3a',
      'small_red_triangle_down':'\ud83d\udd3b',
      'smile':'\ud83d\ude04',
      'smile_cat':'\ud83d\ude38',
      'smiley':'\ud83d\ude03',
      'smiley_cat':'\ud83d\ude3a',
      'smiling_imp':'\ud83d\ude08',
      'smirk':'\ud83d\ude0f',
      'smirk_cat':'\ud83d\ude3c',
      'smoking':'\ud83d\udeac',
      'snail':'\ud83d\udc0c',
      'snake':'\ud83d\udc0d',
      'sneezing_face':'\ud83e\udd27',
      'snowboarder':'\ud83c\udfc2',
      'snowflake':'\u2744\ufe0f',
      'snowman':'\u26c4\ufe0f',
      'snowman_with_snow':'\u2603\ufe0f',
      'sob':'\ud83d\ude2d',
      'soccer':'\u26bd\ufe0f',
      'soon':'\ud83d\udd1c',
      'sos':'\ud83c\udd98',
      'sound':'\ud83d\udd09',
      'space_invader':'\ud83d\udc7e',
      'spades':'\u2660\ufe0f',
      'spaghetti':'\ud83c\udf5d',
      'sparkle':'\u2747\ufe0f',
      'sparkler':'\ud83c\udf87',
      'sparkles':'\u2728',
      'sparkling_heart':'\ud83d\udc96',
      'speak_no_evil':'\ud83d\ude4a',
      'speaker':'\ud83d\udd08',
      'speaking_head':'\ud83d\udde3',
      'speech_balloon':'\ud83d\udcac',
      'speedboat':'\ud83d\udea4',
      'spider':'\ud83d\udd77',
      'spider_web':'\ud83d\udd78',
      'spiral_calendar':'\ud83d\uddd3',
      'spiral_notepad':'\ud83d\uddd2',
      'spoon':'\ud83e\udd44',
      'squid':'\ud83e\udd91',
      'stadium':'\ud83c\udfdf',
      'star':'\u2b50\ufe0f',
      'star2':'\ud83c\udf1f',
      'star_and_crescent':'\u262a\ufe0f',
      'star_of_david':'\u2721\ufe0f',
      'stars':'\ud83c\udf20',
      'station':'\ud83d\ude89',
      'statue_of_liberty':'\ud83d\uddfd',
      'steam_locomotive':'\ud83d\ude82',
      'stew':'\ud83c\udf72',
      'stop_button':'\u23f9',
      'stop_sign':'\ud83d\uded1',
      'stopwatch':'\u23f1',
      'straight_ruler':'\ud83d\udccf',
      'strawberry':'\ud83c\udf53',
      'stuck_out_tongue':'\ud83d\ude1b',
      'stuck_out_tongue_closed_eyes':'\ud83d\ude1d',
      'stuck_out_tongue_winking_eye':'\ud83d\ude1c',
      'studio_microphone':'\ud83c\udf99',
      'stuffed_flatbread':'\ud83e\udd59',
      'sun_behind_large_cloud':'\ud83c\udf25',
      'sun_behind_rain_cloud':'\ud83c\udf26',
      'sun_behind_small_cloud':'\ud83c\udf24',
      'sun_with_face':'\ud83c\udf1e',
      'sunflower':'\ud83c\udf3b',
      'sunglasses':'\ud83d\ude0e',
      'sunny':'\u2600\ufe0f',
      'sunrise':'\ud83c\udf05',
      'sunrise_over_mountains':'\ud83c\udf04',
      'surfing_man':'\ud83c\udfc4',
      'surfing_woman':'\ud83c\udfc4&zwj;\u2640\ufe0f',
      'sushi':'\ud83c\udf63',
      'suspension_railway':'\ud83d\ude9f',
      'sweat':'\ud83d\ude13',
      'sweat_drops':'\ud83d\udca6',
      'sweat_smile':'\ud83d\ude05',
      'sweet_potato':'\ud83c\udf60',
      'swimming_man':'\ud83c\udfca',
      'swimming_woman':'\ud83c\udfca&zwj;\u2640\ufe0f',
      'symbols':'\ud83d\udd23',
      'synagogue':'\ud83d\udd4d',
      'syringe':'\ud83d\udc89',
      'taco':'\ud83c\udf2e',
      'tada':'\ud83c\udf89',
      'tanabata_tree':'\ud83c\udf8b',
      'taurus':'\u2649\ufe0f',
      'taxi':'\ud83d\ude95',
      'tea':'\ud83c\udf75',
      'telephone_receiver':'\ud83d\udcde',
      'telescope':'\ud83d\udd2d',
      'tennis':'\ud83c\udfbe',
      'tent':'\u26fa\ufe0f',
      'thermometer':'\ud83c\udf21',
      'thinking':'\ud83e\udd14',
      'thought_balloon':'\ud83d\udcad',
      'ticket':'\ud83c\udfab',
      'tickets':'\ud83c\udf9f',
      'tiger':'\ud83d\udc2f',
      'tiger2':'\ud83d\udc05',
      'timer_clock':'\u23f2',
      'tipping_hand_man':'\ud83d\udc81&zwj;\u2642\ufe0f',
      'tired_face':'\ud83d\ude2b',
      'tm':'\u2122\ufe0f',
      'toilet':'\ud83d\udebd',
      'tokyo_tower':'\ud83d\uddfc',
      'tomato':'\ud83c\udf45',
      'tongue':'\ud83d\udc45',
      'top':'\ud83d\udd1d',
      'tophat':'\ud83c\udfa9',
      'tornado':'\ud83c\udf2a',
      'trackball':'\ud83d\uddb2',
      'tractor':'\ud83d\ude9c',
      'traffic_light':'\ud83d\udea5',
      'train':'\ud83d\ude8b',
      'train2':'\ud83d\ude86',
      'tram':'\ud83d\ude8a',
      'triangular_flag_on_post':'\ud83d\udea9',
      'triangular_ruler':'\ud83d\udcd0',
      'trident':'\ud83d\udd31',
      'triumph':'\ud83d\ude24',
      'trolleybus':'\ud83d\ude8e',
      'trophy':'\ud83c\udfc6',
      'tropical_drink':'\ud83c\udf79',
      'tropical_fish':'\ud83d\udc20',
      'truck':'\ud83d\ude9a',
      'trumpet':'\ud83c\udfba',
      'tulip':'\ud83c\udf37',
      'tumbler_glass':'\ud83e\udd43',
      'turkey':'\ud83e\udd83',
      'turtle':'\ud83d\udc22',
      'tv':'\ud83d\udcfa',
      'twisted_rightwards_arrows':'\ud83d\udd00',
      'two_hearts':'\ud83d\udc95',
      'two_men_holding_hands':'\ud83d\udc6c',
      'two_women_holding_hands':'\ud83d\udc6d',
      'u5272':'\ud83c\ude39',
      'u5408':'\ud83c\ude34',
      'u55b6':'\ud83c\ude3a',
      'u6307':'\ud83c\ude2f\ufe0f',
      'u6708':'\ud83c\ude37\ufe0f',
      'u6709':'\ud83c\ude36',
      'u6e80':'\ud83c\ude35',
      'u7121':'\ud83c\ude1a\ufe0f',
      'u7533':'\ud83c\ude38',
      'u7981':'\ud83c\ude32',
      'u7a7a':'\ud83c\ude33',
      'umbrella':'\u2614\ufe0f',
      'unamused':'\ud83d\ude12',
      'underage':'\ud83d\udd1e',
      'unicorn':'\ud83e\udd84',
      'unlock':'\ud83d\udd13',
      'up':'\ud83c\udd99',
      'upside_down_face':'\ud83d\ude43',
      'v':'\u270c\ufe0f',
      'vertical_traffic_light':'\ud83d\udea6',
      'vhs':'\ud83d\udcfc',
      'vibration_mode':'\ud83d\udcf3',
      'video_camera':'\ud83d\udcf9',
      'video_game':'\ud83c\udfae',
      'violin':'\ud83c\udfbb',
      'virgo':'\u264d\ufe0f',
      'volcano':'\ud83c\udf0b',
      'volleyball':'\ud83c\udfd0',
      'vs':'\ud83c\udd9a',
      'vulcan_salute':'\ud83d\udd96',
      'walking_man':'\ud83d\udeb6',
      'walking_woman':'\ud83d\udeb6&zwj;\u2640\ufe0f',
      'waning_crescent_moon':'\ud83c\udf18',
      'waning_gibbous_moon':'\ud83c\udf16',
      'warning':'\u26a0\ufe0f',
      'wastebasket':'\ud83d\uddd1',
      'watch':'\u231a\ufe0f',
      'water_buffalo':'\ud83d\udc03',
      'watermelon':'\ud83c\udf49',
      'wave':'\ud83d\udc4b',
      'wavy_dash':'\u3030\ufe0f',
      'waxing_crescent_moon':'\ud83c\udf12',
      'wc':'\ud83d\udebe',
      'weary':'\ud83d\ude29',
      'wedding':'\ud83d\udc92',
      'weight_lifting_man':'\ud83c\udfcb\ufe0f',
      'weight_lifting_woman':'\ud83c\udfcb\ufe0f&zwj;\u2640\ufe0f',
      'whale':'\ud83d\udc33',
      'whale2':'\ud83d\udc0b',
      'wheel_of_dharma':'\u2638\ufe0f',
      'wheelchair':'\u267f\ufe0f',
      'white_check_mark':'\u2705',
      'white_circle':'\u26aa\ufe0f',
      'white_flag':'\ud83c\udff3\ufe0f',
      'white_flower':'\ud83d\udcae',
      'white_large_square':'\u2b1c\ufe0f',
      'white_medium_small_square':'\u25fd\ufe0f',
      'white_medium_square':'\u25fb\ufe0f',
      'white_small_square':'\u25ab\ufe0f',
      'white_square_button':'\ud83d\udd33',
      'wilted_flower':'\ud83e\udd40',
      'wind_chime':'\ud83c\udf90',
      'wind_face':'\ud83c\udf2c',
      'wine_glass':'\ud83c\udf77',
      'wink':'\ud83d\ude09',
      'wolf':'\ud83d\udc3a',
      'woman':'\ud83d\udc69',
      'woman_artist':'\ud83d\udc69&zwj;\ud83c\udfa8',
      'woman_astronaut':'\ud83d\udc69&zwj;\ud83d\ude80',
      'woman_cartwheeling':'\ud83e\udd38&zwj;\u2640\ufe0f',
      'woman_cook':'\ud83d\udc69&zwj;\ud83c\udf73',
      'woman_facepalming':'\ud83e\udd26&zwj;\u2640\ufe0f',
      'woman_factory_worker':'\ud83d\udc69&zwj;\ud83c\udfed',
      'woman_farmer':'\ud83d\udc69&zwj;\ud83c\udf3e',
      'woman_firefighter':'\ud83d\udc69&zwj;\ud83d\ude92',
      'woman_health_worker':'\ud83d\udc69&zwj;\u2695\ufe0f',
      'woman_judge':'\ud83d\udc69&zwj;\u2696\ufe0f',
      'woman_juggling':'\ud83e\udd39&zwj;\u2640\ufe0f',
      'woman_mechanic':'\ud83d\udc69&zwj;\ud83d\udd27',
      'woman_office_worker':'\ud83d\udc69&zwj;\ud83d\udcbc',
      'woman_pilot':'\ud83d\udc69&zwj;\u2708\ufe0f',
      'woman_playing_handball':'\ud83e\udd3e&zwj;\u2640\ufe0f',
      'woman_playing_water_polo':'\ud83e\udd3d&zwj;\u2640\ufe0f',
      'woman_scientist':'\ud83d\udc69&zwj;\ud83d\udd2c',
      'woman_shrugging':'\ud83e\udd37&zwj;\u2640\ufe0f',
      'woman_singer':'\ud83d\udc69&zwj;\ud83c\udfa4',
      'woman_student':'\ud83d\udc69&zwj;\ud83c\udf93',
      'woman_teacher':'\ud83d\udc69&zwj;\ud83c\udfeb',
      'woman_technologist':'\ud83d\udc69&zwj;\ud83d\udcbb',
      'woman_with_turban':'\ud83d\udc73&zwj;\u2640\ufe0f',
      'womans_clothes':'\ud83d\udc5a',
      'womans_hat':'\ud83d\udc52',
      'women_wrestling':'\ud83e\udd3c&zwj;\u2640\ufe0f',
      'womens':'\ud83d\udeba',
      'world_map':'\ud83d\uddfa',
      'worried':'\ud83d\ude1f',
      'wrench':'\ud83d\udd27',
      'writing_hand':'\u270d\ufe0f',
      'x':'\u274c',
      'yellow_heart':'\ud83d\udc9b',
      'yen':'\ud83d\udcb4',
      'yin_yang':'\u262f\ufe0f',
      'yum':'\ud83d\ude0b',
      'zap':'\u26a1\ufe0f',
      'zipper_mouth_face':'\ud83e\udd10',
      'zzz':'\ud83d\udca4',

      /* special emojis :P */
      'octocat':  '<img alt=":octocat:" height="20" width="20" align="absmiddle" src="https://assets-cdn.github.com/images/icons/emoji/octocat.png">',
      'showdown': '<span style="font-family: \'Anonymous Pro\', monospace; text-decoration: underline; text-decoration-style: dashed; text-decoration-color: #3e8b8a;text-underline-position: under;">S</span>'
    };

    /**
     * Created by Estevao on 31-05-2015.
     */

    /**
     * Showdown Converter class
     * @class
     * @param {object} [converterOptions]
     * @returns {Converter}
     */
    showdown.Converter = function (converterOptions) {

      var
          /**
           * Options used by this converter
           * @private
           * @type {{}}
           */
          options = {},

          /**
           * Language extensions used by this converter
           * @private
           * @type {Array}
           */
          langExtensions = [],

          /**
           * Output modifiers extensions used by this converter
           * @private
           * @type {Array}
           */
          outputModifiers = [],

          /**
           * Event listeners
           * @private
           * @type {{}}
           */
          listeners = {},

          /**
           * The flavor set in this converter
           */
          setConvFlavor = setFlavor,

          /**
           * Metadata of the document
           * @type {{parsed: {}, raw: string, format: string}}
           */
          metadata = {
            parsed: {},
            raw: '',
            format: ''
          };

      _constructor();

      /**
       * Converter constructor
       * @private
       */
      function _constructor () {
        converterOptions = converterOptions || {};

        for (var gOpt in globalOptions) {
          if (globalOptions.hasOwnProperty(gOpt)) {
            options[gOpt] = globalOptions[gOpt];
          }
        }

        // Merge options
        if (typeof converterOptions === 'object') {
          for (var opt in converterOptions) {
            if (converterOptions.hasOwnProperty(opt)) {
              options[opt] = converterOptions[opt];
            }
          }
        } else {
          throw Error('Converter expects the passed parameter to be an object, but ' + typeof converterOptions +
          ' was passed instead.');
        }

        if (options.extensions) {
          showdown.helper.forEach(options.extensions, _parseExtension);
        }
      }

      /**
       * Parse extension
       * @param {*} ext
       * @param {string} [name='']
       * @private
       */
      function _parseExtension (ext, name) {

        name = name || null;
        // If it's a string, the extension was previously loaded
        if (showdown.helper.isString(ext)) {
          ext = showdown.helper.stdExtName(ext);
          name = ext;

          // LEGACY_SUPPORT CODE
          if (showdown.extensions[ext]) {
            console.warn('DEPRECATION WARNING: ' + ext + ' is an old extension that uses a deprecated loading method.' +
              'Please inform the developer that the extension should be updated!');
            legacyExtensionLoading(showdown.extensions[ext], ext);
            return;
            // END LEGACY SUPPORT CODE

          } else if (!showdown.helper.isUndefined(extensions[ext])) {
            ext = extensions[ext];

          } else {
            throw Error('Extension "' + ext + '" could not be loaded. It was either not found or is not a valid extension.');
          }
        }

        if (typeof ext === 'function') {
          ext = ext();
        }

        if (!showdown.helper.isArray(ext)) {
          ext = [ext];
        }

        var validExt = validate(ext, name);
        if (!validExt.valid) {
          throw Error(validExt.error);
        }

        for (var i = 0; i < ext.length; ++i) {
          switch (ext[i].type) {

            case 'lang':
              langExtensions.push(ext[i]);
              break;

            case 'output':
              outputModifiers.push(ext[i]);
              break;
          }
          if (ext[i].hasOwnProperty('listeners')) {
            for (var ln in ext[i].listeners) {
              if (ext[i].listeners.hasOwnProperty(ln)) {
                listen(ln, ext[i].listeners[ln]);
              }
            }
          }
        }

      }

      /**
       * LEGACY_SUPPORT
       * @param {*} ext
       * @param {string} name
       */
      function legacyExtensionLoading (ext, name) {
        if (typeof ext === 'function') {
          ext = ext(new showdown.Converter());
        }
        if (!showdown.helper.isArray(ext)) {
          ext = [ext];
        }
        var valid = validate(ext, name);

        if (!valid.valid) {
          throw Error(valid.error);
        }

        for (var i = 0; i < ext.length; ++i) {
          switch (ext[i].type) {
            case 'lang':
              langExtensions.push(ext[i]);
              break;
            case 'output':
              outputModifiers.push(ext[i]);
              break;
            default:// should never reach here
              throw Error('Extension loader error: Type unrecognized!!!');
          }
        }
      }

      /**
       * Listen to an event
       * @param {string} name
       * @param {function} callback
       */
      function listen (name, callback) {
        if (!showdown.helper.isString(name)) {
          throw Error('Invalid argument in converter.listen() method: name must be a string, but ' + typeof name + ' given');
        }

        if (typeof callback !== 'function') {
          throw Error('Invalid argument in converter.listen() method: callback must be a function, but ' + typeof callback + ' given');
        }

        if (!listeners.hasOwnProperty(name)) {
          listeners[name] = [];
        }
        listeners[name].push(callback);
      }

      function rTrimInputText (text) {
        var rsp = text.match(/^\s*/)[0].length,
            rgx = new RegExp('^\\s{0,' + rsp + '}', 'gm');
        return text.replace(rgx, '');
      }

      /**
       * Dispatch an event
       * @private
       * @param {string} evtName Event name
       * @param {string} text Text
       * @param {{}} options Converter Options
       * @param {{}} globals
       * @returns {string}
       */
      this._dispatch = function dispatch (evtName, text, options, globals) {
        if (listeners.hasOwnProperty(evtName)) {
          for (var ei = 0; ei < listeners[evtName].length; ++ei) {
            var nText = listeners[evtName][ei](evtName, text, this, options, globals);
            if (nText && typeof nText !== 'undefined') {
              text = nText;
            }
          }
        }
        return text;
      };

      /**
       * Listen to an event
       * @param {string} name
       * @param {function} callback
       * @returns {showdown.Converter}
       */
      this.listen = function (name, callback) {
        listen(name, callback);
        return this;
      };

      /**
       * Converts a markdown string into HTML
       * @param {string} text
       * @returns {*}
       */
      this.makeHtml = function (text) {
        //check if text is not falsy
        if (!text) {
          return text;
        }

        var globals = {
          gHtmlBlocks:     [],
          gHtmlMdBlocks:   [],
          gHtmlSpans:      [],
          gUrls:           {},
          gTitles:         {},
          gDimensions:     {},
          gListLevel:      0,
          hashLinkCounts:  {},
          langExtensions:  langExtensions,
          outputModifiers: outputModifiers,
          converter:       this,
          ghCodeBlocks:    [],
          metadata: {
            parsed: {},
            raw: '',
            format: ''
          }
        };

        // This lets us use ¨ trema as an escape char to avoid md5 hashes
        // The choice of character is arbitrary; anything that isn't
        // magic in Markdown will work.
        text = text.replace(/¨/g, '¨T');

        // Replace $ with ¨D
        // RegExp interprets $ as a special character
        // when it's in a replacement string
        text = text.replace(/\$/g, '¨D');

        // Standardize line endings
        text = text.replace(/\r\n/g, '\n'); // DOS to Unix
        text = text.replace(/\r/g, '\n'); // Mac to Unix

        // Stardardize line spaces
        text = text.replace(/\u00A0/g, '&nbsp;');

        if (options.smartIndentationFix) {
          text = rTrimInputText(text);
        }

        // Make sure text begins and ends with a couple of newlines:
        text = '\n\n' + text + '\n\n';

        // detab
        text = showdown.subParser('detab')(text, options, globals);

        /**
         * Strip any lines consisting only of spaces and tabs.
         * This makes subsequent regexs easier to write, because we can
         * match consecutive blank lines with /\n+/ instead of something
         * contorted like /[ \t]*\n+/
         */
        text = text.replace(/^[ \t]+$/mg, '');

        //run languageExtensions
        showdown.helper.forEach(langExtensions, function (ext) {
          text = showdown.subParser('runExtension')(ext, text, options, globals);
        });

        // run the sub parsers
        text = showdown.subParser('metadata')(text, options, globals);
        text = showdown.subParser('hashPreCodeTags')(text, options, globals);
        text = showdown.subParser('githubCodeBlocks')(text, options, globals);
        text = showdown.subParser('hashHTMLBlocks')(text, options, globals);
        text = showdown.subParser('hashCodeTags')(text, options, globals);
        text = showdown.subParser('stripLinkDefinitions')(text, options, globals);
        text = showdown.subParser('blockGamut')(text, options, globals);
        text = showdown.subParser('unhashHTMLSpans')(text, options, globals);
        text = showdown.subParser('unescapeSpecialChars')(text, options, globals);

        // attacklab: Restore dollar signs
        text = text.replace(/¨D/g, '$$');

        // attacklab: Restore tremas
        text = text.replace(/¨T/g, '¨');

        // render a complete html document instead of a partial if the option is enabled
        text = showdown.subParser('completeHTMLDocument')(text, options, globals);

        // Run output modifiers
        showdown.helper.forEach(outputModifiers, function (ext) {
          text = showdown.subParser('runExtension')(ext, text, options, globals);
        });

        // update metadata
        metadata = globals.metadata;
        return text;
      };

      /**
       * Converts an HTML string into a markdown string
       * @param src
       * @param [HTMLParser] A WHATWG DOM and HTML parser, such as JSDOM. If none is supplied, window.document will be used.
       * @returns {string}
       */
      this.makeMarkdown = this.makeMd = function (src, HTMLParser) {

        // replace \r\n with \n
        src = src.replace(/\r\n/g, '\n');
        src = src.replace(/\r/g, '\n'); // old macs

        // due to an edge case, we need to find this: > <
        // to prevent removing of non silent white spaces
        // ex: <em>this is</em> <strong>sparta</strong>
        src = src.replace(/>[ \t]+</, '>¨NBSP;<');

        if (!HTMLParser) {
          if (window && window.document) {
            HTMLParser = window.document;
          } else {
            throw new Error('HTMLParser is undefined. If in a webworker or nodejs environment, you need to provide a WHATWG DOM and HTML such as JSDOM');
          }
        }

        var doc = HTMLParser.createElement('div');
        doc.innerHTML = src;

        var globals = {
          preList: substitutePreCodeTags(doc)
        };

        // remove all newlines and collapse spaces
        clean(doc);

        // some stuff, like accidental reference links must now be escaped
        // TODO
        // doc.innerHTML = doc.innerHTML.replace(/\[[\S\t ]]/);

        var nodes = doc.childNodes,
            mdDoc = '';

        for (var i = 0; i < nodes.length; i++) {
          mdDoc += showdown.subParser('makeMarkdown.node')(nodes[i], globals);
        }

        function clean (node) {
          for (var n = 0; n < node.childNodes.length; ++n) {
            var child = node.childNodes[n];
            if (child.nodeType === 3) {
              if (!/\S/.test(child.nodeValue)) {
                node.removeChild(child);
                --n;
              } else {
                child.nodeValue = child.nodeValue.split('\n').join(' ');
                child.nodeValue = child.nodeValue.replace(/(\s)+/g, '$1');
              }
            } else if (child.nodeType === 1) {
              clean(child);
            }
          }
        }

        // find all pre tags and replace contents with placeholder
        // we need this so that we can remove all indentation from html
        // to ease up parsing
        function substitutePreCodeTags (doc) {

          var pres = doc.querySelectorAll('pre'),
              presPH = [];

          for (var i = 0; i < pres.length; ++i) {

            if (pres[i].childElementCount === 1 && pres[i].firstChild.tagName.toLowerCase() === 'code') {
              var content = pres[i].firstChild.innerHTML.trim(),
                  language = pres[i].firstChild.getAttribute('data-language') || '';

              // if data-language attribute is not defined, then we look for class language-*
              if (language === '') {
                var classes = pres[i].firstChild.className.split(' ');
                for (var c = 0; c < classes.length; ++c) {
                  var matches = classes[c].match(/^language-(.+)$/);
                  if (matches !== null) {
                    language = matches[1];
                    break;
                  }
                }
              }

              // unescape html entities in content
              content = showdown.helper.unescapeHTMLEntities(content);

              presPH.push(content);
              pres[i].outerHTML = '<precode language="' + language + '" precodenum="' + i.toString() + '"></precode>';
            } else {
              presPH.push(pres[i].innerHTML);
              pres[i].innerHTML = '';
              pres[i].setAttribute('prenum', i.toString());
            }
          }
          return presPH;
        }

        return mdDoc;
      };

      /**
       * Set an option of this Converter instance
       * @param {string} key
       * @param {*} value
       */
      this.setOption = function (key, value) {
        options[key] = value;
      };

      /**
       * Get the option of this Converter instance
       * @param {string} key
       * @returns {*}
       */
      this.getOption = function (key) {
        return options[key];
      };

      /**
       * Get the options of this Converter instance
       * @returns {{}}
       */
      this.getOptions = function () {
        return options;
      };

      /**
       * Add extension to THIS converter
       * @param {{}} extension
       * @param {string} [name=null]
       */
      this.addExtension = function (extension, name) {
        name = name || null;
        _parseExtension(extension, name);
      };

      /**
       * Use a global registered extension with THIS converter
       * @param {string} extensionName Name of the previously registered extension
       */
      this.useExtension = function (extensionName) {
        _parseExtension(extensionName);
      };

      /**
       * Set the flavor THIS converter should use
       * @param {string} name
       */
      this.setFlavor = function (name) {
        if (!flavor.hasOwnProperty(name)) {
          throw Error(name + ' flavor was not found');
        }
        var preset = flavor[name];
        setConvFlavor = name;
        for (var option in preset) {
          if (preset.hasOwnProperty(option)) {
            options[option] = preset[option];
          }
        }
      };

      /**
       * Get the currently set flavor of this converter
       * @returns {string}
       */
      this.getFlavor = function () {
        return setConvFlavor;
      };

      /**
       * Remove an extension from THIS converter.
       * Note: This is a costly operation. It's better to initialize a new converter
       * and specify the extensions you wish to use
       * @param {Array} extension
       */
      this.removeExtension = function (extension) {
        if (!showdown.helper.isArray(extension)) {
          extension = [extension];
        }
        for (var a = 0; a < extension.length; ++a) {
          var ext = extension[a];
          for (var i = 0; i < langExtensions.length; ++i) {
            if (langExtensions[i] === ext) {
              langExtensions[i].splice(i, 1);
            }
          }
          for (var ii = 0; ii < outputModifiers.length; ++i) {
            if (outputModifiers[ii] === ext) {
              outputModifiers[ii].splice(i, 1);
            }
          }
        }
      };

      /**
       * Get all extension of THIS converter
       * @returns {{language: Array, output: Array}}
       */
      this.getAllExtensions = function () {
        return {
          language: langExtensions,
          output: outputModifiers
        };
      };

      /**
       * Get the metadata of the previously parsed document
       * @param raw
       * @returns {string|{}}
       */
      this.getMetadata = function (raw) {
        if (raw) {
          return metadata.raw;
        } else {
          return metadata.parsed;
        }
      };

      /**
       * Get the metadata format of the previously parsed document
       * @returns {string}
       */
      this.getMetadataFormat = function () {
        return metadata.format;
      };

      /**
       * Private: set a single key, value metadata pair
       * @param {string} key
       * @param {string} value
       */
      this._setMetadataPair = function (key, value) {
        metadata.parsed[key] = value;
      };

      /**
       * Private: set metadata format
       * @param {string} format
       */
      this._setMetadataFormat = function (format) {
        metadata.format = format;
      };

      /**
       * Private: set metadata raw text
       * @param {string} raw
       */
      this._setMetadataRaw = function (raw) {
        metadata.raw = raw;
      };
    };

    /**
     * Turn Markdown link shortcuts into XHTML <a> tags.
     */
    showdown.subParser('anchors', function (text, options, globals) {

      text = globals.converter._dispatch('anchors.before', text, options, globals);

      var writeAnchorTag = function (wholeMatch, linkText, linkId, url, m5, m6, title) {
        if (showdown.helper.isUndefined(title)) {
          title = '';
        }
        linkId = linkId.toLowerCase();

        // Special case for explicit empty url
        if (wholeMatch.search(/\(<?\s*>? ?(['"].*['"])?\)$/m) > -1) {
          url = '';
        } else if (!url) {
          if (!linkId) {
            // lower-case and turn embedded newlines into spaces
            linkId = linkText.toLowerCase().replace(/ ?\n/g, ' ');
          }
          url = '#' + linkId;

          if (!showdown.helper.isUndefined(globals.gUrls[linkId])) {
            url = globals.gUrls[linkId];
            if (!showdown.helper.isUndefined(globals.gTitles[linkId])) {
              title = globals.gTitles[linkId];
            }
          } else {
            return wholeMatch;
          }
        }

        //url = showdown.helper.escapeCharacters(url, '*_', false); // replaced line to improve performance
        url = url.replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);

        var result = '<a href="' + url + '"';

        if (title !== '' && title !== null) {
          title = title.replace(/"/g, '&quot;');
          //title = showdown.helper.escapeCharacters(title, '*_', false); // replaced line to improve performance
          title = title.replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
          result += ' title="' + title + '"';
        }

        // optionLinksInNewWindow only applies
        // to external links. Hash links (#) open in same page
        if (options.openLinksInNewWindow && !/^#/.test(url)) {
          // escaped _
          result += ' rel="noopener noreferrer" target="¨E95Eblank"';
        }

        result += '>' + linkText + '</a>';

        return result;
      };

      // First, handle reference-style links: [link text] [id]
      text = text.replace(/\[((?:\[[^\]]*]|[^\[\]])*)] ?(?:\n *)?\[(.*?)]()()()()/g, writeAnchorTag);

      // Next, inline-style links: [link text](url "optional title")
      // cases with crazy urls like ./image/cat1).png
      text = text.replace(/\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<([^>]*)>(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g,
        writeAnchorTag);

      // normal cases
      text = text.replace(/\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g,
        writeAnchorTag);

      // handle reference-style shortcuts: [link text]
      // These must come last in case you've also got [link test][1]
      // or [link test](/foo)
      text = text.replace(/\[([^\[\]]+)]()()()()()/g, writeAnchorTag);

      // Lastly handle GithubMentions if option is enabled
      if (options.ghMentions) {
        text = text.replace(/(^|\s)(\\)?(@([a-z\d]+(?:[a-z\d.-]+?[a-z\d]+)*))/gmi, function (wm, st, escape, mentions, username) {
          if (escape === '\\') {
            return st + mentions;
          }

          //check if options.ghMentionsLink is a string
          if (!showdown.helper.isString(options.ghMentionsLink)) {
            throw new Error('ghMentionsLink option must be a string');
          }
          var lnk = options.ghMentionsLink.replace(/\{u}/g, username),
              target = '';
          if (options.openLinksInNewWindow) {
            target = ' rel="noopener noreferrer" target="¨E95Eblank"';
          }
          return st + '<a href="' + lnk + '"' + target + '>' + mentions + '</a>';
        });
      }

      text = globals.converter._dispatch('anchors.after', text, options, globals);
      return text;
    });

    // url allowed chars [a-z\d_.~:/?#[]@!$&'()*+,;=-]

    var simpleURLRegex  = /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+?\.[^'">\s]+?)()(\1)?(?=\s|$)(?!["<>])/gi,
        simpleURLRegex2 = /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+\.[^'">\s]+?)([.!?,()\[\]])?(\1)?(?=\s|$)(?!["<>])/gi,
        delimUrlRegex   = /()<(((https?|ftp|dict):\/\/|www\.)[^'">\s]+)()>()/gi,
        simpleMailRegex = /(^|\s)(?:mailto:)?([A-Za-z0-9!#$%&'*+-/=?^_`{|}~.]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)(?=$|\s)/gmi,
        delimMailRegex  = /<()(?:mailto:)?([-.\w]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi,

        replaceLink = function (options) {
          return function (wm, leadingMagicChars, link, m2, m3, trailingPunctuation, trailingMagicChars) {
            link = link.replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
            var lnkTxt = link,
                append = '',
                target = '',
                lmc    = leadingMagicChars || '',
                tmc    = trailingMagicChars || '';
            if (/^www\./i.test(link)) {
              link = link.replace(/^www\./i, 'http://www.');
            }
            if (options.excludeTrailingPunctuationFromURLs && trailingPunctuation) {
              append = trailingPunctuation;
            }
            if (options.openLinksInNewWindow) {
              target = ' rel="noopener noreferrer" target="¨E95Eblank"';
            }
            return lmc + '<a href="' + link + '"' + target + '>' + lnkTxt + '</a>' + append + tmc;
          };
        },

        replaceMail = function (options, globals) {
          return function (wholeMatch, b, mail) {
            var href = 'mailto:';
            b = b || '';
            mail = showdown.subParser('unescapeSpecialChars')(mail, options, globals);
            if (options.encodeEmails) {
              href = showdown.helper.encodeEmailAddress(href + mail);
              mail = showdown.helper.encodeEmailAddress(mail);
            } else {
              href = href + mail;
            }
            return b + '<a href="' + href + '">' + mail + '</a>';
          };
        };

    showdown.subParser('autoLinks', function (text, options, globals) {

      text = globals.converter._dispatch('autoLinks.before', text, options, globals);

      text = text.replace(delimUrlRegex, replaceLink(options));
      text = text.replace(delimMailRegex, replaceMail(options, globals));

      text = globals.converter._dispatch('autoLinks.after', text, options, globals);

      return text;
    });

    showdown.subParser('simplifiedAutoLinks', function (text, options, globals) {

      if (!options.simplifiedAutoLink) {
        return text;
      }

      text = globals.converter._dispatch('simplifiedAutoLinks.before', text, options, globals);

      if (options.excludeTrailingPunctuationFromURLs) {
        text = text.replace(simpleURLRegex2, replaceLink(options));
      } else {
        text = text.replace(simpleURLRegex, replaceLink(options));
      }
      text = text.replace(simpleMailRegex, replaceMail(options, globals));

      text = globals.converter._dispatch('simplifiedAutoLinks.after', text, options, globals);

      return text;
    });

    /**
     * These are all the transformations that form block-level
     * tags like paragraphs, headers, and list items.
     */
    showdown.subParser('blockGamut', function (text, options, globals) {

      text = globals.converter._dispatch('blockGamut.before', text, options, globals);

      // we parse blockquotes first so that we can have headings and hrs
      // inside blockquotes
      text = showdown.subParser('blockQuotes')(text, options, globals);
      text = showdown.subParser('headers')(text, options, globals);

      // Do Horizontal Rules:
      text = showdown.subParser('horizontalRule')(text, options, globals);

      text = showdown.subParser('lists')(text, options, globals);
      text = showdown.subParser('codeBlocks')(text, options, globals);
      text = showdown.subParser('tables')(text, options, globals);

      // We already ran _HashHTMLBlocks() before, in Markdown(), but that
      // was to escape raw HTML in the original Markdown source. This time,
      // we're escaping the markup we've just created, so that we don't wrap
      // <p> tags around block-level tags.
      text = showdown.subParser('hashHTMLBlocks')(text, options, globals);
      text = showdown.subParser('paragraphs')(text, options, globals);

      text = globals.converter._dispatch('blockGamut.after', text, options, globals);

      return text;
    });

    showdown.subParser('blockQuotes', function (text, options, globals) {

      text = globals.converter._dispatch('blockQuotes.before', text, options, globals);

      // add a couple extra lines after the text and endtext mark
      text = text + '\n\n';

      var rgx = /(^ {0,3}>[ \t]?.+\n(.+\n)*\n*)+/gm;

      if (options.splitAdjacentBlockquotes) {
        rgx = /^ {0,3}>[\s\S]*?(?:\n\n)/gm;
      }

      text = text.replace(rgx, function (bq) {
        // attacklab: hack around Konqueror 3.5.4 bug:
        // "----------bug".replace(/^-/g,"") == "bug"
        bq = bq.replace(/^[ \t]*>[ \t]?/gm, ''); // trim one level of quoting

        // attacklab: clean up hack
        bq = bq.replace(/¨0/g, '');

        bq = bq.replace(/^[ \t]+$/gm, ''); // trim whitespace-only lines
        bq = showdown.subParser('githubCodeBlocks')(bq, options, globals);
        bq = showdown.subParser('blockGamut')(bq, options, globals); // recurse

        bq = bq.replace(/(^|\n)/g, '$1  ');
        // These leading spaces screw with <pre> content, so we need to fix that:
        bq = bq.replace(/(\s*<pre>[^\r]+?<\/pre>)/gm, function (wholeMatch, m1) {
          var pre = m1;
          // attacklab: hack around Konqueror 3.5.4 bug:
          pre = pre.replace(/^  /mg, '¨0');
          pre = pre.replace(/¨0/g, '');
          return pre;
        });

        return showdown.subParser('hashBlock')('<blockquote>\n' + bq + '\n</blockquote>', options, globals);
      });

      text = globals.converter._dispatch('blockQuotes.after', text, options, globals);
      return text;
    });

    /**
     * Process Markdown `<pre><code>` blocks.
     */
    showdown.subParser('codeBlocks', function (text, options, globals) {

      text = globals.converter._dispatch('codeBlocks.before', text, options, globals);

      // sentinel workarounds for lack of \A and \Z, safari\khtml bug
      text += '¨0';

      var pattern = /(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=¨0))/g;
      text = text.replace(pattern, function (wholeMatch, m1, m2) {
        var codeblock = m1,
            nextChar = m2,
            end = '\n';

        codeblock = showdown.subParser('outdent')(codeblock, options, globals);
        codeblock = showdown.subParser('encodeCode')(codeblock, options, globals);
        codeblock = showdown.subParser('detab')(codeblock, options, globals);
        codeblock = codeblock.replace(/^\n+/g, ''); // trim leading newlines
        codeblock = codeblock.replace(/\n+$/g, ''); // trim trailing newlines

        if (options.omitExtraWLInCodeBlocks) {
          end = '';
        }

        codeblock = '<pre><code>' + codeblock + end + '</code></pre>';

        return showdown.subParser('hashBlock')(codeblock, options, globals) + nextChar;
      });

      // strip sentinel
      text = text.replace(/¨0/, '');

      text = globals.converter._dispatch('codeBlocks.after', text, options, globals);
      return text;
    });

    /**
     *
     *   *  Backtick quotes are used for <code></code> spans.
     *
     *   *  You can use multiple backticks as the delimiters if you want to
     *     include literal backticks in the code span. So, this input:
     *
     *         Just type ``foo `bar` baz`` at the prompt.
     *
     *       Will translate to:
     *
     *         <p>Just type <code>foo `bar` baz</code> at the prompt.</p>
     *
     *    There's no arbitrary limit to the number of backticks you
     *    can use as delimters. If you need three consecutive backticks
     *    in your code, use four for delimiters, etc.
     *
     *  *  You can use spaces to get literal backticks at the edges:
     *
     *         ... type `` `bar` `` ...
     *
     *       Turns to:
     *
     *         ... type <code>`bar`</code> ...
     */
    showdown.subParser('codeSpans', function (text, options, globals) {

      text = globals.converter._dispatch('codeSpans.before', text, options, globals);

      if (typeof text === 'undefined') {
        text = '';
      }
      text = text.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
        function (wholeMatch, m1, m2, m3) {
          var c = m3;
          c = c.replace(/^([ \t]*)/g, '');	// leading whitespace
          c = c.replace(/[ \t]*$/g, '');	// trailing whitespace
          c = showdown.subParser('encodeCode')(c, options, globals);
          c = m1 + '<code>' + c + '</code>';
          c = showdown.subParser('hashHTMLSpans')(c, options, globals);
          return c;
        }
      );

      text = globals.converter._dispatch('codeSpans.after', text, options, globals);
      return text;
    });

    /**
     * Create a full HTML document from the processed markdown
     */
    showdown.subParser('completeHTMLDocument', function (text, options, globals) {

      if (!options.completeHTMLDocument) {
        return text;
      }

      text = globals.converter._dispatch('completeHTMLDocument.before', text, options, globals);

      var doctype = 'html',
          doctypeParsed = '<!DOCTYPE HTML>\n',
          title = '',
          charset = '<meta charset="utf-8">\n',
          lang = '',
          metadata = '';

      if (typeof globals.metadata.parsed.doctype !== 'undefined') {
        doctypeParsed = '<!DOCTYPE ' +  globals.metadata.parsed.doctype + '>\n';
        doctype = globals.metadata.parsed.doctype.toString().toLowerCase();
        if (doctype === 'html' || doctype === 'html5') {
          charset = '<meta charset="utf-8">';
        }
      }

      for (var meta in globals.metadata.parsed) {
        if (globals.metadata.parsed.hasOwnProperty(meta)) {
          switch (meta.toLowerCase()) {
            case 'doctype':
              break;

            case 'title':
              title = '<title>' +  globals.metadata.parsed.title + '</title>\n';
              break;

            case 'charset':
              if (doctype === 'html' || doctype === 'html5') {
                charset = '<meta charset="' + globals.metadata.parsed.charset + '">\n';
              } else {
                charset = '<meta name="charset" content="' + globals.metadata.parsed.charset + '">\n';
              }
              break;

            case 'language':
            case 'lang':
              lang = ' lang="' + globals.metadata.parsed[meta] + '"';
              metadata += '<meta name="' + meta + '" content="' + globals.metadata.parsed[meta] + '">\n';
              break;

            default:
              metadata += '<meta name="' + meta + '" content="' + globals.metadata.parsed[meta] + '">\n';
          }
        }
      }

      text = doctypeParsed + '<html' + lang + '>\n<head>\n' + title + charset + metadata + '</head>\n<body>\n' + text.trim() + '\n</body>\n</html>';

      text = globals.converter._dispatch('completeHTMLDocument.after', text, options, globals);
      return text;
    });

    /**
     * Convert all tabs to spaces
     */
    showdown.subParser('detab', function (text, options, globals) {
      text = globals.converter._dispatch('detab.before', text, options, globals);

      // expand first n-1 tabs
      text = text.replace(/\t(?=\t)/g, '    '); // g_tab_width

      // replace the nth with two sentinels
      text = text.replace(/\t/g, '¨A¨B');

      // use the sentinel to anchor our regex so it doesn't explode
      text = text.replace(/¨B(.+?)¨A/g, function (wholeMatch, m1) {
        var leadingText = m1,
            numSpaces = 4 - leadingText.length % 4;  // g_tab_width

        // there *must* be a better way to do this:
        for (var i = 0; i < numSpaces; i++) {
          leadingText += ' ';
        }

        return leadingText;
      });

      // clean up sentinels
      text = text.replace(/¨A/g, '    ');  // g_tab_width
      text = text.replace(/¨B/g, '');

      text = globals.converter._dispatch('detab.after', text, options, globals);
      return text;
    });

    showdown.subParser('ellipsis', function (text, options, globals) {

      text = globals.converter._dispatch('ellipsis.before', text, options, globals);

      text = text.replace(/\.\.\./g, '…');

      text = globals.converter._dispatch('ellipsis.after', text, options, globals);

      return text;
    });

    /**
     * Turn emoji codes into emojis
     *
     * List of supported emojis: https://github.com/showdownjs/showdown/wiki/Emojis
     */
    showdown.subParser('emoji', function (text, options, globals) {

      if (!options.emoji) {
        return text;
      }

      text = globals.converter._dispatch('emoji.before', text, options, globals);

      var emojiRgx = /:([\S]+?):/g;

      text = text.replace(emojiRgx, function (wm, emojiCode) {
        if (showdown.helper.emojis.hasOwnProperty(emojiCode)) {
          return showdown.helper.emojis[emojiCode];
        }
        return wm;
      });

      text = globals.converter._dispatch('emoji.after', text, options, globals);

      return text;
    });

    /**
     * Smart processing for ampersands and angle brackets that need to be encoded.
     */
    showdown.subParser('encodeAmpsAndAngles', function (text, options, globals) {
      text = globals.converter._dispatch('encodeAmpsAndAngles.before', text, options, globals);

      // Ampersand-encoding based entirely on Nat Irons's Amputator MT plugin:
      // http://bumppo.net/projects/amputator/
      text = text.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, '&amp;');

      // Encode naked <'s
      text = text.replace(/<(?![a-z\/?$!])/gi, '&lt;');

      // Encode <
      text = text.replace(/</g, '&lt;');

      // Encode >
      text = text.replace(/>/g, '&gt;');

      text = globals.converter._dispatch('encodeAmpsAndAngles.after', text, options, globals);
      return text;
    });

    /**
     * Returns the string, with after processing the following backslash escape sequences.
     *
     * attacklab: The polite way to do this is with the new escapeCharacters() function:
     *
     *    text = escapeCharacters(text,"\\",true);
     *    text = escapeCharacters(text,"`*_{}[]()>#+-.!",true);
     *
     * ...but we're sidestepping its use of the (slow) RegExp constructor
     * as an optimization for Firefox.  This function gets called a LOT.
     */
    showdown.subParser('encodeBackslashEscapes', function (text, options, globals) {
      text = globals.converter._dispatch('encodeBackslashEscapes.before', text, options, globals);

      text = text.replace(/\\(\\)/g, showdown.helper.escapeCharactersCallback);
      text = text.replace(/\\([`*_{}\[\]()>#+.!~=|-])/g, showdown.helper.escapeCharactersCallback);

      text = globals.converter._dispatch('encodeBackslashEscapes.after', text, options, globals);
      return text;
    });

    /**
     * Encode/escape certain characters inside Markdown code runs.
     * The point is that in code, these characters are literals,
     * and lose their special Markdown meanings.
     */
    showdown.subParser('encodeCode', function (text, options, globals) {

      text = globals.converter._dispatch('encodeCode.before', text, options, globals);

      // Encode all ampersands; HTML entities are not
      // entities within a Markdown code span.
      text = text
        .replace(/&/g, '&amp;')
      // Do the angle bracket song and dance:
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      // Now, escape characters that are magic in Markdown:
        .replace(/([*_{}\[\]\\=~-])/g, showdown.helper.escapeCharactersCallback);

      text = globals.converter._dispatch('encodeCode.after', text, options, globals);
      return text;
    });

    /**
     * Within tags -- meaning between < and > -- encode [\ ` * _ ~ =] so they
     * don't conflict with their use in Markdown for code, italics and strong.
     */
    showdown.subParser('escapeSpecialCharsWithinTagAttributes', function (text, options, globals) {
      text = globals.converter._dispatch('escapeSpecialCharsWithinTagAttributes.before', text, options, globals);

      // Build a regex to find HTML tags.
      var tags     = /<\/?[a-z\d_:-]+(?:[\s]+[\s\S]+?)?>/gi,
          comments = /<!(--(?:(?:[^>-]|-[^>])(?:[^-]|-[^-])*)--)>/gi;

      text = text.replace(tags, function (wholeMatch) {
        return wholeMatch
          .replace(/(.)<\/?code>(?=.)/g, '$1`')
          .replace(/([\\`*_~=|])/g, showdown.helper.escapeCharactersCallback);
      });

      text = text.replace(comments, function (wholeMatch) {
        return wholeMatch
          .replace(/([\\`*_~=|])/g, showdown.helper.escapeCharactersCallback);
      });

      text = globals.converter._dispatch('escapeSpecialCharsWithinTagAttributes.after', text, options, globals);
      return text;
    });

    /**
     * Handle github codeblocks prior to running HashHTML so that
     * HTML contained within the codeblock gets escaped properly
     * Example:
     * ```ruby
     *     def hello_world(x)
     *       puts "Hello, #{x}"
     *     end
     * ```
     */
    showdown.subParser('githubCodeBlocks', function (text, options, globals) {

      // early exit if option is not enabled
      if (!options.ghCodeBlocks) {
        return text;
      }

      text = globals.converter._dispatch('githubCodeBlocks.before', text, options, globals);

      text += '¨0';

      text = text.replace(/(?:^|\n)(?: {0,3})(```+|~~~+)(?: *)([^\s`~]*)\n([\s\S]*?)\n(?: {0,3})\1/g, function (wholeMatch, delim, language, codeblock) {
        var end = (options.omitExtraWLInCodeBlocks) ? '' : '\n';

        // First parse the github code block
        codeblock = showdown.subParser('encodeCode')(codeblock, options, globals);
        codeblock = showdown.subParser('detab')(codeblock, options, globals);
        codeblock = codeblock.replace(/^\n+/g, ''); // trim leading newlines
        codeblock = codeblock.replace(/\n+$/g, ''); // trim trailing whitespace

        codeblock = '<pre><code' + (language ? ' class="' + language + ' language-' + language + '"' : '') + '>' + codeblock + end + '</code></pre>';

        codeblock = showdown.subParser('hashBlock')(codeblock, options, globals);

        // Since GHCodeblocks can be false positives, we need to
        // store the primitive text and the parsed text in a global var,
        // and then return a token
        return '\n\n¨G' + (globals.ghCodeBlocks.push({text: wholeMatch, codeblock: codeblock}) - 1) + 'G\n\n';
      });

      // attacklab: strip sentinel
      text = text.replace(/¨0/, '');

      return globals.converter._dispatch('githubCodeBlocks.after', text, options, globals);
    });

    showdown.subParser('hashBlock', function (text, options, globals) {
      text = globals.converter._dispatch('hashBlock.before', text, options, globals);
      text = text.replace(/(^\n+|\n+$)/g, '');
      text = '\n\n¨K' + (globals.gHtmlBlocks.push(text) - 1) + 'K\n\n';
      text = globals.converter._dispatch('hashBlock.after', text, options, globals);
      return text;
    });

    /**
     * Hash and escape <code> elements that should not be parsed as markdown
     */
    showdown.subParser('hashCodeTags', function (text, options, globals) {
      text = globals.converter._dispatch('hashCodeTags.before', text, options, globals);

      var repFunc = function (wholeMatch, match, left, right) {
        var codeblock = left + showdown.subParser('encodeCode')(match, options, globals) + right;
        return '¨C' + (globals.gHtmlSpans.push(codeblock) - 1) + 'C';
      };

      // Hash naked <code>
      text = showdown.helper.replaceRecursiveRegExp(text, repFunc, '<code\\b[^>]*>', '</code>', 'gim');

      text = globals.converter._dispatch('hashCodeTags.after', text, options, globals);
      return text;
    });

    showdown.subParser('hashElement', function (text, options, globals) {

      return function (wholeMatch, m1) {
        var blockText = m1;

        // Undo double lines
        blockText = blockText.replace(/\n\n/g, '\n');
        blockText = blockText.replace(/^\n/, '');

        // strip trailing blank lines
        blockText = blockText.replace(/\n+$/g, '');

        // Replace the element text with a marker ("¨KxK" where x is its key)
        blockText = '\n\n¨K' + (globals.gHtmlBlocks.push(blockText) - 1) + 'K\n\n';

        return blockText;
      };
    });

    showdown.subParser('hashHTMLBlocks', function (text, options, globals) {
      text = globals.converter._dispatch('hashHTMLBlocks.before', text, options, globals);

      var blockTags = [
            'pre',
            'div',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'blockquote',
            'table',
            'dl',
            'ol',
            'ul',
            'script',
            'noscript',
            'form',
            'fieldset',
            'iframe',
            'math',
            'style',
            'section',
            'header',
            'footer',
            'nav',
            'article',
            'aside',
            'address',
            'audio',
            'canvas',
            'figure',
            'hgroup',
            'output',
            'video',
            'p'
          ],
          repFunc = function (wholeMatch, match, left, right) {
            var txt = wholeMatch;
            // check if this html element is marked as markdown
            // if so, it's contents should be parsed as markdown
            if (left.search(/\bmarkdown\b/) !== -1) {
              txt = left + globals.converter.makeHtml(match) + right;
            }
            return '\n\n¨K' + (globals.gHtmlBlocks.push(txt) - 1) + 'K\n\n';
          };

      if (options.backslashEscapesHTMLTags) {
        // encode backslash escaped HTML tags
        text = text.replace(/\\<(\/?[^>]+?)>/g, function (wm, inside) {
          return '&lt;' + inside + '&gt;';
        });
      }

      // hash HTML Blocks
      for (var i = 0; i < blockTags.length; ++i) {

        var opTagPos,
            rgx1     = new RegExp('^ {0,3}(<' + blockTags[i] + '\\b[^>]*>)', 'im'),
            patLeft  = '<' + blockTags[i] + '\\b[^>]*>',
            patRight = '</' + blockTags[i] + '>';
        // 1. Look for the first position of the first opening HTML tag in the text
        while ((opTagPos = showdown.helper.regexIndexOf(text, rgx1)) !== -1) {

          // if the HTML tag is \ escaped, we need to escape it and break


          //2. Split the text in that position
          var subTexts = showdown.helper.splitAtIndex(text, opTagPos),
              //3. Match recursively
              newSubText1 = showdown.helper.replaceRecursiveRegExp(subTexts[1], repFunc, patLeft, patRight, 'im');

          // prevent an infinite loop
          if (newSubText1 === subTexts[1]) {
            break;
          }
          text = subTexts[0].concat(newSubText1);
        }
      }
      // HR SPECIAL CASE
      text = text.replace(/(\n {0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g,
        showdown.subParser('hashElement')(text, options, globals));

      // Special case for standalone HTML comments
      text = showdown.helper.replaceRecursiveRegExp(text, function (txt) {
        return '\n\n¨K' + (globals.gHtmlBlocks.push(txt) - 1) + 'K\n\n';
      }, '^ {0,3}<!--', '-->', 'gm');

      // PHP and ASP-style processor instructions (<?...?> and <%...%>)
      text = text.replace(/(?:\n\n)( {0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g,
        showdown.subParser('hashElement')(text, options, globals));

      text = globals.converter._dispatch('hashHTMLBlocks.after', text, options, globals);
      return text;
    });

    /**
     * Hash span elements that should not be parsed as markdown
     */
    showdown.subParser('hashHTMLSpans', function (text, options, globals) {
      text = globals.converter._dispatch('hashHTMLSpans.before', text, options, globals);

      function hashHTMLSpan (html) {
        return '¨C' + (globals.gHtmlSpans.push(html) - 1) + 'C';
      }

      // Hash Self Closing tags
      text = text.replace(/<[^>]+?\/>/gi, function (wm) {
        return hashHTMLSpan(wm);
      });

      // Hash tags without properties
      text = text.replace(/<([^>]+?)>[\s\S]*?<\/\1>/g, function (wm) {
        return hashHTMLSpan(wm);
      });

      // Hash tags with properties
      text = text.replace(/<([^>]+?)\s[^>]+?>[\s\S]*?<\/\1>/g, function (wm) {
        return hashHTMLSpan(wm);
      });

      // Hash self closing tags without />
      text = text.replace(/<[^>]+?>/gi, function (wm) {
        return hashHTMLSpan(wm);
      });

      /*showdown.helper.matchRecursiveRegExp(text, '<code\\b[^>]*>', '</code>', 'gi');*/

      text = globals.converter._dispatch('hashHTMLSpans.after', text, options, globals);
      return text;
    });

    /**
     * Unhash HTML spans
     */
    showdown.subParser('unhashHTMLSpans', function (text, options, globals) {
      text = globals.converter._dispatch('unhashHTMLSpans.before', text, options, globals);

      for (var i = 0; i < globals.gHtmlSpans.length; ++i) {
        var repText = globals.gHtmlSpans[i],
            // limiter to prevent infinite loop (assume 10 as limit for recurse)
            limit = 0;

        while (/¨C(\d+)C/.test(repText)) {
          var num = RegExp.$1;
          repText = repText.replace('¨C' + num + 'C', globals.gHtmlSpans[num]);
          if (limit === 10) {
            console.error('maximum nesting of 10 spans reached!!!');
            break;
          }
          ++limit;
        }
        text = text.replace('¨C' + i + 'C', repText);
      }

      text = globals.converter._dispatch('unhashHTMLSpans.after', text, options, globals);
      return text;
    });

    /**
     * Hash and escape <pre><code> elements that should not be parsed as markdown
     */
    showdown.subParser('hashPreCodeTags', function (text, options, globals) {
      text = globals.converter._dispatch('hashPreCodeTags.before', text, options, globals);

      var repFunc = function (wholeMatch, match, left, right) {
        // encode html entities
        var codeblock = left + showdown.subParser('encodeCode')(match, options, globals) + right;
        return '\n\n¨G' + (globals.ghCodeBlocks.push({text: wholeMatch, codeblock: codeblock}) - 1) + 'G\n\n';
      };

      // Hash <pre><code>
      text = showdown.helper.replaceRecursiveRegExp(text, repFunc, '^ {0,3}<pre\\b[^>]*>\\s*<code\\b[^>]*>', '^ {0,3}</code>\\s*</pre>', 'gim');

      text = globals.converter._dispatch('hashPreCodeTags.after', text, options, globals);
      return text;
    });

    showdown.subParser('headers', function (text, options, globals) {

      text = globals.converter._dispatch('headers.before', text, options, globals);

      var headerLevelStart = (isNaN(parseInt(options.headerLevelStart))) ? 1 : parseInt(options.headerLevelStart),

          // Set text-style headers:
          //	Header 1
          //	========
          //
          //	Header 2
          //	--------
          //
          setextRegexH1 = (options.smoothLivePreview) ? /^(.+)[ \t]*\n={2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n=+[ \t]*\n+/gm,
          setextRegexH2 = (options.smoothLivePreview) ? /^(.+)[ \t]*\n-{2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n-+[ \t]*\n+/gm;

      text = text.replace(setextRegexH1, function (wholeMatch, m1) {

        var spanGamut = showdown.subParser('spanGamut')(m1, options, globals),
            hID = (options.noHeaderId) ? '' : ' id="' + headerId(m1) + '"',
            hLevel = headerLevelStart,
            hashBlock = '<h' + hLevel + hID + '>' + spanGamut + '</h' + hLevel + '>';
        return showdown.subParser('hashBlock')(hashBlock, options, globals);
      });

      text = text.replace(setextRegexH2, function (matchFound, m1) {
        var spanGamut = showdown.subParser('spanGamut')(m1, options, globals),
            hID = (options.noHeaderId) ? '' : ' id="' + headerId(m1) + '"',
            hLevel = headerLevelStart + 1,
            hashBlock = '<h' + hLevel + hID + '>' + spanGamut + '</h' + hLevel + '>';
        return showdown.subParser('hashBlock')(hashBlock, options, globals);
      });

      // atx-style headers:
      //  # Header 1
      //  ## Header 2
      //  ## Header 2 with closing hashes ##
      //  ...
      //  ###### Header 6
      //
      var atxStyle = (options.requireSpaceBeforeHeadingText) ? /^(#{1,6})[ \t]+(.+?)[ \t]*#*\n+/gm : /^(#{1,6})[ \t]*(.+?)[ \t]*#*\n+/gm;

      text = text.replace(atxStyle, function (wholeMatch, m1, m2) {
        var hText = m2;
        if (options.customizedHeaderId) {
          hText = m2.replace(/\s?\{([^{]+?)}\s*$/, '');
        }

        var span = showdown.subParser('spanGamut')(hText, options, globals),
            hID = (options.noHeaderId) ? '' : ' id="' + headerId(m2) + '"',
            hLevel = headerLevelStart - 1 + m1.length,
            header = '<h' + hLevel + hID + '>' + span + '</h' + hLevel + '>';

        return showdown.subParser('hashBlock')(header, options, globals);
      });

      function headerId (m) {
        var title,
            prefix;

        // It is separate from other options to allow combining prefix and customized
        if (options.customizedHeaderId) {
          var match = m.match(/\{([^{]+?)}\s*$/);
          if (match && match[1]) {
            m = match[1];
          }
        }

        title = m;

        // Prefix id to prevent causing inadvertent pre-existing style matches.
        if (showdown.helper.isString(options.prefixHeaderId)) {
          prefix = options.prefixHeaderId;
        } else if (options.prefixHeaderId === true) {
          prefix = 'section-';
        } else {
          prefix = '';
        }

        if (!options.rawPrefixHeaderId) {
          title = prefix + title;
        }

        if (options.ghCompatibleHeaderId) {
          title = title
            .replace(/ /g, '-')
            // replace previously escaped chars (&, ¨ and $)
            .replace(/&amp;/g, '')
            .replace(/¨T/g, '')
            .replace(/¨D/g, '')
            // replace rest of the chars (&~$ are repeated as they might have been escaped)
            // borrowed from github's redcarpet (some they should produce similar results)
            .replace(/[&+$,\/:;=?@"#{}|^¨~\[\]`\\*)(%.!'<>]/g, '')
            .toLowerCase();
        } else if (options.rawHeaderId) {
          title = title
            .replace(/ /g, '-')
            // replace previously escaped chars (&, ¨ and $)
            .replace(/&amp;/g, '&')
            .replace(/¨T/g, '¨')
            .replace(/¨D/g, '$')
            // replace " and '
            .replace(/["']/g, '-')
            .toLowerCase();
        } else {
          title = title
            .replace(/[^\w]/g, '')
            .toLowerCase();
        }

        if (options.rawPrefixHeaderId) {
          title = prefix + title;
        }

        if (globals.hashLinkCounts[title]) {
          title = title + '-' + (globals.hashLinkCounts[title]++);
        } else {
          globals.hashLinkCounts[title] = 1;
        }
        return title;
      }

      text = globals.converter._dispatch('headers.after', text, options, globals);
      return text;
    });

    /**
     * Turn Markdown link shortcuts into XHTML <a> tags.
     */
    showdown.subParser('horizontalRule', function (text, options, globals) {
      text = globals.converter._dispatch('horizontalRule.before', text, options, globals);

      var key = showdown.subParser('hashBlock')('<hr />', options, globals);
      text = text.replace(/^ {0,2}( ?-){3,}[ \t]*$/gm, key);
      text = text.replace(/^ {0,2}( ?\*){3,}[ \t]*$/gm, key);
      text = text.replace(/^ {0,2}( ?_){3,}[ \t]*$/gm, key);

      text = globals.converter._dispatch('horizontalRule.after', text, options, globals);
      return text;
    });

    /**
     * Turn Markdown image shortcuts into <img> tags.
     */
    showdown.subParser('images', function (text, options, globals) {

      text = globals.converter._dispatch('images.before', text, options, globals);

      var inlineRegExp      = /!\[([^\]]*?)][ \t]*()\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g,
          crazyRegExp       = /!\[([^\]]*?)][ \t]*()\([ \t]?<([^>]*)>(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(?:(["'])([^"]*?)\6))?[ \t]?\)/g,
          base64RegExp      = /!\[([^\]]*?)][ \t]*()\([ \t]?<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g,
          referenceRegExp   = /!\[([^\]]*?)] ?(?:\n *)?\[([\s\S]*?)]()()()()()/g,
          refShortcutRegExp = /!\[([^\[\]]+)]()()()()()/g;

      function writeImageTagBase64 (wholeMatch, altText, linkId, url, width, height, m5, title) {
        url = url.replace(/\s/g, '');
        return writeImageTag (wholeMatch, altText, linkId, url, width, height, m5, title);
      }

      function writeImageTag (wholeMatch, altText, linkId, url, width, height, m5, title) {

        var gUrls   = globals.gUrls,
            gTitles = globals.gTitles,
            gDims   = globals.gDimensions;

        linkId = linkId.toLowerCase();

        if (!title) {
          title = '';
        }
        // Special case for explicit empty url
        if (wholeMatch.search(/\(<?\s*>? ?(['"].*['"])?\)$/m) > -1) {
          url = '';

        } else if (url === '' || url === null) {
          if (linkId === '' || linkId === null) {
            // lower-case and turn embedded newlines into spaces
            linkId = altText.toLowerCase().replace(/ ?\n/g, ' ');
          }
          url = '#' + linkId;

          if (!showdown.helper.isUndefined(gUrls[linkId])) {
            url = gUrls[linkId];
            if (!showdown.helper.isUndefined(gTitles[linkId])) {
              title = gTitles[linkId];
            }
            if (!showdown.helper.isUndefined(gDims[linkId])) {
              width = gDims[linkId].width;
              height = gDims[linkId].height;
            }
          } else {
            return wholeMatch;
          }
        }

        altText = altText
          .replace(/"/g, '&quot;')
        //altText = showdown.helper.escapeCharacters(altText, '*_', false);
          .replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
        //url = showdown.helper.escapeCharacters(url, '*_', false);
        url = url.replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
        var result = '<img src="' + url + '" alt="' + altText + '"';

        if (title && showdown.helper.isString(title)) {
          title = title
            .replace(/"/g, '&quot;')
          //title = showdown.helper.escapeCharacters(title, '*_', false);
            .replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
          result += ' title="' + title + '"';
        }

        if (width && height) {
          width  = (width === '*') ? 'auto' : width;
          height = (height === '*') ? 'auto' : height;

          result += ' width="' + width + '"';
          result += ' height="' + height + '"';
        }

        result += ' />';

        return result;
      }

      // First, handle reference-style labeled images: ![alt text][id]
      text = text.replace(referenceRegExp, writeImageTag);

      // Next, handle inline images:  ![alt text](url =<width>x<height> "optional title")

      // base64 encoded images
      text = text.replace(base64RegExp, writeImageTagBase64);

      // cases with crazy urls like ./image/cat1).png
      text = text.replace(crazyRegExp, writeImageTag);

      // normal cases
      text = text.replace(inlineRegExp, writeImageTag);

      // handle reference-style shortcuts: ![img text]
      text = text.replace(refShortcutRegExp, writeImageTag);

      text = globals.converter._dispatch('images.after', text, options, globals);
      return text;
    });

    showdown.subParser('italicsAndBold', function (text, options, globals) {

      text = globals.converter._dispatch('italicsAndBold.before', text, options, globals);

      // it's faster to have 3 separate regexes for each case than have just one
      // because of backtracing, in some cases, it could lead to an exponential effect
      // called "catastrophic backtrace". Ominous!

      function parseInside (txt, left, right) {
        /*
        if (options.simplifiedAutoLink) {
          txt = showdown.subParser('simplifiedAutoLinks')(txt, options, globals);
        }
        */
        return left + txt + right;
      }

      // Parse underscores
      if (options.literalMidWordUnderscores) {
        text = text.replace(/\b___(\S[\s\S]*?)___\b/g, function (wm, txt) {
          return parseInside (txt, '<strong><em>', '</em></strong>');
        });
        text = text.replace(/\b__(\S[\s\S]*?)__\b/g, function (wm, txt) {
          return parseInside (txt, '<strong>', '</strong>');
        });
        text = text.replace(/\b_(\S[\s\S]*?)_\b/g, function (wm, txt) {
          return parseInside (txt, '<em>', '</em>');
        });
      } else {
        text = text.replace(/___(\S[\s\S]*?)___/g, function (wm, m) {
          return (/\S$/.test(m)) ? parseInside (m, '<strong><em>', '</em></strong>') : wm;
        });
        text = text.replace(/__(\S[\s\S]*?)__/g, function (wm, m) {
          return (/\S$/.test(m)) ? parseInside (m, '<strong>', '</strong>') : wm;
        });
        text = text.replace(/_([^\s_][\s\S]*?)_/g, function (wm, m) {
          // !/^_[^_]/.test(m) - test if it doesn't start with __ (since it seems redundant, we removed it)
          return (/\S$/.test(m)) ? parseInside (m, '<em>', '</em>') : wm;
        });
      }

      // Now parse asterisks
      if (options.literalMidWordAsterisks) {
        text = text.replace(/([^*]|^)\B\*\*\*(\S[\s\S]*?)\*\*\*\B(?!\*)/g, function (wm, lead, txt) {
          return parseInside (txt, lead + '<strong><em>', '</em></strong>');
        });
        text = text.replace(/([^*]|^)\B\*\*(\S[\s\S]*?)\*\*\B(?!\*)/g, function (wm, lead, txt) {
          return parseInside (txt, lead + '<strong>', '</strong>');
        });
        text = text.replace(/([^*]|^)\B\*(\S[\s\S]*?)\*\B(?!\*)/g, function (wm, lead, txt) {
          return parseInside (txt, lead + '<em>', '</em>');
        });
      } else {
        text = text.replace(/\*\*\*(\S[\s\S]*?)\*\*\*/g, function (wm, m) {
          return (/\S$/.test(m)) ? parseInside (m, '<strong><em>', '</em></strong>') : wm;
        });
        text = text.replace(/\*\*(\S[\s\S]*?)\*\*/g, function (wm, m) {
          return (/\S$/.test(m)) ? parseInside (m, '<strong>', '</strong>') : wm;
        });
        text = text.replace(/\*([^\s*][\s\S]*?)\*/g, function (wm, m) {
          // !/^\*[^*]/.test(m) - test if it doesn't start with ** (since it seems redundant, we removed it)
          return (/\S$/.test(m)) ? parseInside (m, '<em>', '</em>') : wm;
        });
      }


      text = globals.converter._dispatch('italicsAndBold.after', text, options, globals);
      return text;
    });

    /**
     * Form HTML ordered (numbered) and unordered (bulleted) lists.
     */
    showdown.subParser('lists', function (text, options, globals) {

      /**
       * Process the contents of a single ordered or unordered list, splitting it
       * into individual list items.
       * @param {string} listStr
       * @param {boolean} trimTrailing
       * @returns {string}
       */
      function processListItems (listStr, trimTrailing) {
        // The $g_list_level global keeps track of when we're inside a list.
        // Each time we enter a list, we increment it; when we leave a list,
        // we decrement. If it's zero, we're not in a list anymore.
        //
        // We do this because when we're not inside a list, we want to treat
        // something like this:
        //
        //    I recommend upgrading to version
        //    8. Oops, now this line is treated
        //    as a sub-list.
        //
        // As a single paragraph, despite the fact that the second line starts
        // with a digit-period-space sequence.
        //
        // Whereas when we're inside a list (or sub-list), that line will be
        // treated as the start of a sub-list. What a kludge, huh? This is
        // an aspect of Markdown's syntax that's hard to parse perfectly
        // without resorting to mind-reading. Perhaps the solution is to
        // change the syntax rules such that sub-lists must start with a
        // starting cardinal number; e.g. "1." or "a.".
        globals.gListLevel++;

        // trim trailing blank lines:
        listStr = listStr.replace(/\n{2,}$/, '\n');

        // attacklab: add sentinel to emulate \z
        listStr += '¨0';

        var rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0| {0,3}([*+-]|\d+[.])[ \t]+))/gm,
            isParagraphed = (/\n[ \t]*\n(?!¨0)/.test(listStr));

        // Since version 1.5, nesting sublists requires 4 spaces (or 1 tab) indentation,
        // which is a syntax breaking change
        // activating this option reverts to old behavior
        if (options.disableForced4SpacesIndentedSublists) {
          rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0|\2([*+-]|\d+[.])[ \t]+))/gm;
        }

        listStr = listStr.replace(rgx, function (wholeMatch, m1, m2, m3, m4, taskbtn, checked) {
          checked = (checked && checked.trim() !== '');

          var item = showdown.subParser('outdent')(m4, options, globals),
              bulletStyle = '';

          // Support for github tasklists
          if (taskbtn && options.tasklists) {
            bulletStyle = ' class="task-list-item" style="list-style-type: none;"';
            item = item.replace(/^[ \t]*\[(x|X| )?]/m, function () {
              var otp = '<input type="checkbox" disabled style="margin: 0px 0.35em 0.25em -1.6em; vertical-align: middle;"';
              if (checked) {
                otp += ' checked';
              }
              otp += '>';
              return otp;
            });
          }

          // ISSUE #312
          // This input: - - - a
          // causes trouble to the parser, since it interprets it as:
          // <ul><li><li><li>a</li></li></li></ul>
          // instead of:
          // <ul><li>- - a</li></ul>
          // So, to prevent it, we will put a marker (¨A)in the beginning of the line
          // Kind of hackish/monkey patching, but seems more effective than overcomplicating the list parser
          item = item.replace(/^([-*+]|\d\.)[ \t]+[\S\n ]*/g, function (wm2) {
            return '¨A' + wm2;
          });

          // m1 - Leading line or
          // Has a double return (multi paragraph) or
          // Has sublist
          if (m1 || (item.search(/\n{2,}/) > -1)) {
            item = showdown.subParser('githubCodeBlocks')(item, options, globals);
            item = showdown.subParser('blockGamut')(item, options, globals);
          } else {
            // Recursion for sub-lists:
            item = showdown.subParser('lists')(item, options, globals);
            item = item.replace(/\n$/, ''); // chomp(item)
            item = showdown.subParser('hashHTMLBlocks')(item, options, globals);

            // Colapse double linebreaks
            item = item.replace(/\n\n+/g, '\n\n');
            if (isParagraphed) {
              item = showdown.subParser('paragraphs')(item, options, globals);
            } else {
              item = showdown.subParser('spanGamut')(item, options, globals);
            }
          }

          // now we need to remove the marker (¨A)
          item = item.replace('¨A', '');
          // we can finally wrap the line in list item tags
          item =  '<li' + bulletStyle + '>' + item + '</li>\n';

          return item;
        });

        // attacklab: strip sentinel
        listStr = listStr.replace(/¨0/g, '');

        globals.gListLevel--;

        if (trimTrailing) {
          listStr = listStr.replace(/\s+$/, '');
        }

        return listStr;
      }

      function styleStartNumber (list, listType) {
        // check if ol and starts by a number different than 1
        if (listType === 'ol') {
          var res = list.match(/^ *(\d+)\./);
          if (res && res[1] !== '1') {
            return ' start="' + res[1] + '"';
          }
        }
        return '';
      }

      /**
       * Check and parse consecutive lists (better fix for issue #142)
       * @param {string} list
       * @param {string} listType
       * @param {boolean} trimTrailing
       * @returns {string}
       */
      function parseConsecutiveLists (list, listType, trimTrailing) {
        // check if we caught 2 or more consecutive lists by mistake
        // we use the counterRgx, meaning if listType is UL we look for OL and vice versa
        var olRgx = (options.disableForced4SpacesIndentedSublists) ? /^ ?\d+\.[ \t]/gm : /^ {0,3}\d+\.[ \t]/gm,
            ulRgx = (options.disableForced4SpacesIndentedSublists) ? /^ ?[*+-][ \t]/gm : /^ {0,3}[*+-][ \t]/gm,
            counterRxg = (listType === 'ul') ? olRgx : ulRgx,
            result = '';

        if (list.search(counterRxg) !== -1) {
          (function parseCL (txt) {
            var pos = txt.search(counterRxg),
                style = styleStartNumber(list, listType);
            if (pos !== -1) {
              // slice
              result += '\n\n<' + listType + style + '>\n' + processListItems(txt.slice(0, pos), !!trimTrailing) + '</' + listType + '>\n';

              // invert counterType and listType
              listType = (listType === 'ul') ? 'ol' : 'ul';
              counterRxg = (listType === 'ul') ? olRgx : ulRgx;

              //recurse
              parseCL(txt.slice(pos));
            } else {
              result += '\n\n<' + listType + style + '>\n' + processListItems(txt, !!trimTrailing) + '</' + listType + '>\n';
            }
          })(list);
        } else {
          var style = styleStartNumber(list, listType);
          result = '\n\n<' + listType + style + '>\n' + processListItems(list, !!trimTrailing) + '</' + listType + '>\n';
        }

        return result;
      }

      /** Start of list parsing **/
      text = globals.converter._dispatch('lists.before', text, options, globals);
      // add sentinel to hack around khtml/safari bug:
      // http://bugs.webkit.org/show_bug.cgi?id=11231
      text += '¨0';

      if (globals.gListLevel) {
        text = text.replace(/^(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
          function (wholeMatch, list, m2) {
            var listType = (m2.search(/[*+-]/g) > -1) ? 'ul' : 'ol';
            return parseConsecutiveLists(list, listType, true);
          }
        );
      } else {
        text = text.replace(/(\n\n|^\n?)(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
          function (wholeMatch, m1, list, m3) {
            var listType = (m3.search(/[*+-]/g) > -1) ? 'ul' : 'ol';
            return parseConsecutiveLists(list, listType, false);
          }
        );
      }

      // strip sentinel
      text = text.replace(/¨0/, '');
      text = globals.converter._dispatch('lists.after', text, options, globals);
      return text;
    });

    /**
     * Parse metadata at the top of the document
     */
    showdown.subParser('metadata', function (text, options, globals) {

      if (!options.metadata) {
        return text;
      }

      text = globals.converter._dispatch('metadata.before', text, options, globals);

      function parseMetadataContents (content) {
        // raw is raw so it's not changed in any way
        globals.metadata.raw = content;

        // escape chars forbidden in html attributes
        // double quotes
        content = content
          // ampersand first
          .replace(/&/g, '&amp;')
          // double quotes
          .replace(/"/g, '&quot;');

        content = content.replace(/\n {4}/g, ' ');
        content.replace(/^([\S ]+): +([\s\S]+?)$/gm, function (wm, key, value) {
          globals.metadata.parsed[key] = value;
          return '';
        });
      }

      text = text.replace(/^\s*«««+(\S*?)\n([\s\S]+?)\n»»»+\n/, function (wholematch, format, content) {
        parseMetadataContents(content);
        return '¨M';
      });

      text = text.replace(/^\s*---+(\S*?)\n([\s\S]+?)\n---+\n/, function (wholematch, format, content) {
        if (format) {
          globals.metadata.format = format;
        }
        parseMetadataContents(content);
        return '¨M';
      });

      text = text.replace(/¨M/g, '');

      text = globals.converter._dispatch('metadata.after', text, options, globals);
      return text;
    });

    /**
     * Remove one level of line-leading tabs or spaces
     */
    showdown.subParser('outdent', function (text, options, globals) {
      text = globals.converter._dispatch('outdent.before', text, options, globals);

      // attacklab: hack around Konqueror 3.5.4 bug:
      // "----------bug".replace(/^-/g,"") == "bug"
      text = text.replace(/^(\t|[ ]{1,4})/gm, '¨0'); // attacklab: g_tab_width

      // attacklab: clean up hack
      text = text.replace(/¨0/g, '');

      text = globals.converter._dispatch('outdent.after', text, options, globals);
      return text;
    });

    /**
     *
     */
    showdown.subParser('paragraphs', function (text, options, globals) {

      text = globals.converter._dispatch('paragraphs.before', text, options, globals);
      // Strip leading and trailing lines:
      text = text.replace(/^\n+/g, '');
      text = text.replace(/\n+$/g, '');

      var grafs = text.split(/\n{2,}/g),
          grafsOut = [],
          end = grafs.length; // Wrap <p> tags

      for (var i = 0; i < end; i++) {
        var str = grafs[i];
        // if this is an HTML marker, copy it
        if (str.search(/¨(K|G)(\d+)\1/g) >= 0) {
          grafsOut.push(str);

        // test for presence of characters to prevent empty lines being parsed
        // as paragraphs (resulting in undesired extra empty paragraphs)
        } else if (str.search(/\S/) >= 0) {
          str = showdown.subParser('spanGamut')(str, options, globals);
          str = str.replace(/^([ \t]*)/g, '<p>');
          str += '</p>';
          grafsOut.push(str);
        }
      }

      /** Unhashify HTML blocks */
      end = grafsOut.length;
      for (i = 0; i < end; i++) {
        var blockText = '',
            grafsOutIt = grafsOut[i],
            codeFlag = false;
        // if this is a marker for an html block...
        // use RegExp.test instead of string.search because of QML bug
        while (/¨(K|G)(\d+)\1/.test(grafsOutIt)) {
          var delim = RegExp.$1,
              num   = RegExp.$2;

          if (delim === 'K') {
            blockText = globals.gHtmlBlocks[num];
          } else {
            // we need to check if ghBlock is a false positive
            if (codeFlag) {
              // use encoded version of all text
              blockText = showdown.subParser('encodeCode')(globals.ghCodeBlocks[num].text, options, globals);
            } else {
              blockText = globals.ghCodeBlocks[num].codeblock;
            }
          }
          blockText = blockText.replace(/\$/g, '$$$$'); // Escape any dollar signs

          grafsOutIt = grafsOutIt.replace(/(\n\n)?¨(K|G)\d+\2(\n\n)?/, blockText);
          // Check if grafsOutIt is a pre->code
          if (/^<pre\b[^>]*>\s*<code\b[^>]*>/.test(grafsOutIt)) {
            codeFlag = true;
          }
        }
        grafsOut[i] = grafsOutIt;
      }
      text = grafsOut.join('\n');
      // Strip leading and trailing lines:
      text = text.replace(/^\n+/g, '');
      text = text.replace(/\n+$/g, '');
      return globals.converter._dispatch('paragraphs.after', text, options, globals);
    });

    /**
     * Run extension
     */
    showdown.subParser('runExtension', function (ext, text, options, globals) {

      if (ext.filter) {
        text = ext.filter(text, globals.converter, options);

      } else if (ext.regex) {
        // TODO remove this when old extension loading mechanism is deprecated
        var re = ext.regex;
        if (!(re instanceof RegExp)) {
          re = new RegExp(re, 'g');
        }
        text = text.replace(re, ext.replace);
      }

      return text;
    });

    /**
     * These are all the transformations that occur *within* block-level
     * tags like paragraphs, headers, and list items.
     */
    showdown.subParser('spanGamut', function (text, options, globals) {

      text = globals.converter._dispatch('spanGamut.before', text, options, globals);
      text = showdown.subParser('codeSpans')(text, options, globals);
      text = showdown.subParser('escapeSpecialCharsWithinTagAttributes')(text, options, globals);
      text = showdown.subParser('encodeBackslashEscapes')(text, options, globals);

      // Process anchor and image tags. Images must come first,
      // because ![foo][f] looks like an anchor.
      text = showdown.subParser('images')(text, options, globals);
      text = showdown.subParser('anchors')(text, options, globals);

      // Make links out of things like `<http://example.com/>`
      // Must come after anchors, because you can use < and >
      // delimiters in inline links like [this](<url>).
      text = showdown.subParser('autoLinks')(text, options, globals);
      text = showdown.subParser('simplifiedAutoLinks')(text, options, globals);
      text = showdown.subParser('emoji')(text, options, globals);
      text = showdown.subParser('underline')(text, options, globals);
      text = showdown.subParser('italicsAndBold')(text, options, globals);
      text = showdown.subParser('strikethrough')(text, options, globals);
      text = showdown.subParser('ellipsis')(text, options, globals);

      // we need to hash HTML tags inside spans
      text = showdown.subParser('hashHTMLSpans')(text, options, globals);

      // now we encode amps and angles
      text = showdown.subParser('encodeAmpsAndAngles')(text, options, globals);

      // Do hard breaks
      if (options.simpleLineBreaks) {
        // GFM style hard breaks
        // only add line breaks if the text does not contain a block (special case for lists)
        if (!/\n\n¨K/.test(text)) {
          text = text.replace(/\n+/g, '<br />\n');
        }
      } else {
        // Vanilla hard breaks
        text = text.replace(/  +\n/g, '<br />\n');
      }

      text = globals.converter._dispatch('spanGamut.after', text, options, globals);
      return text;
    });

    showdown.subParser('strikethrough', function (text, options, globals) {

      function parseInside (txt) {
        if (options.simplifiedAutoLink) {
          txt = showdown.subParser('simplifiedAutoLinks')(txt, options, globals);
        }
        return '<del>' + txt + '</del>';
      }

      if (options.strikethrough) {
        text = globals.converter._dispatch('strikethrough.before', text, options, globals);
        text = text.replace(/(?:~){2}([\s\S]+?)(?:~){2}/g, function (wm, txt) { return parseInside(txt); });
        text = globals.converter._dispatch('strikethrough.after', text, options, globals);
      }

      return text;
    });

    /**
     * Strips link definitions from text, stores the URLs and titles in
     * hash references.
     * Link defs are in the form: ^[id]: url "optional title"
     */
    showdown.subParser('stripLinkDefinitions', function (text, options, globals) {

      var regex       = /^ {0,3}\[(.+)]:[ \t]*\n?[ \t]*<?([^>\s]+)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n+|(?=¨0))/gm,
          base64Regex = /^ {0,3}\[(.+)]:[ \t]*\n?[ \t]*<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n\n|(?=¨0)|(?=\n\[))/gm;

      // attacklab: sentinel workarounds for lack of \A and \Z, safari\khtml bug
      text += '¨0';

      var replaceFunc = function (wholeMatch, linkId, url, width, height, blankLines, title) {
        linkId = linkId.toLowerCase();
        if (url.match(/^data:.+?\/.+?;base64,/)) {
          // remove newlines
          globals.gUrls[linkId] = url.replace(/\s/g, '');
        } else {
          globals.gUrls[linkId] = showdown.subParser('encodeAmpsAndAngles')(url, options, globals);  // Link IDs are case-insensitive
        }

        if (blankLines) {
          // Oops, found blank lines, so it's not a title.
          // Put back the parenthetical statement we stole.
          return blankLines + title;

        } else {
          if (title) {
            globals.gTitles[linkId] = title.replace(/"|'/g, '&quot;');
          }
          if (options.parseImgDimensions && width && height) {
            globals.gDimensions[linkId] = {
              width:  width,
              height: height
            };
          }
        }
        // Completely remove the definition from the text
        return '';
      };

      // first we try to find base64 link references
      text = text.replace(base64Regex, replaceFunc);

      text = text.replace(regex, replaceFunc);

      // attacklab: strip sentinel
      text = text.replace(/¨0/, '');

      return text;
    });

    showdown.subParser('tables', function (text, options, globals) {

      if (!options.tables) {
        return text;
      }

      var tableRgx       = /^ {0,3}\|?.+\|.+\n {0,3}\|?[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*:?[ \t]*(?:[-=]){2,}[\s\S]+?(?:\n\n|¨0)/gm,
          //singeColTblRgx = /^ {0,3}\|.+\|\n {0,3}\|[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*\n(?: {0,3}\|.+\|\n)+(?:\n\n|¨0)/gm;
          singeColTblRgx = /^ {0,3}\|.+\|[ \t]*\n {0,3}\|[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*\n( {0,3}\|.+\|[ \t]*\n)*(?:\n|¨0)/gm;

      function parseStyles (sLine) {
        if (/^:[ \t]*--*$/.test(sLine)) {
          return ' style="text-align:left;"';
        } else if (/^--*[ \t]*:[ \t]*$/.test(sLine)) {
          return ' style="text-align:right;"';
        } else if (/^:[ \t]*--*[ \t]*:$/.test(sLine)) {
          return ' style="text-align:center;"';
        } else {
          return '';
        }
      }

      function parseHeaders (header, style) {
        var id = '';
        header = header.trim();
        // support both tablesHeaderId and tableHeaderId due to error in documentation so we don't break backwards compatibility
        if (options.tablesHeaderId || options.tableHeaderId) {
          id = ' id="' + header.replace(/ /g, '_').toLowerCase() + '"';
        }
        header = showdown.subParser('spanGamut')(header, options, globals);

        return '<th' + id + style + '>' + header + '</th>\n';
      }

      function parseCells (cell, style) {
        var subText = showdown.subParser('spanGamut')(cell, options, globals);
        return '<td' + style + '>' + subText + '</td>\n';
      }

      function buildTable (headers, cells) {
        var tb = '<table>\n<thead>\n<tr>\n',
            tblLgn = headers.length;

        for (var i = 0; i < tblLgn; ++i) {
          tb += headers[i];
        }
        tb += '</tr>\n</thead>\n<tbody>\n';

        for (i = 0; i < cells.length; ++i) {
          tb += '<tr>\n';
          for (var ii = 0; ii < tblLgn; ++ii) {
            tb += cells[i][ii];
          }
          tb += '</tr>\n';
        }
        tb += '</tbody>\n</table>\n';
        return tb;
      }

      function parseTable (rawTable) {
        var i, tableLines = rawTable.split('\n');

        for (i = 0; i < tableLines.length; ++i) {
          // strip wrong first and last column if wrapped tables are used
          if (/^ {0,3}\|/.test(tableLines[i])) {
            tableLines[i] = tableLines[i].replace(/^ {0,3}\|/, '');
          }
          if (/\|[ \t]*$/.test(tableLines[i])) {
            tableLines[i] = tableLines[i].replace(/\|[ \t]*$/, '');
          }
          // parse code spans first, but we only support one line code spans
          tableLines[i] = showdown.subParser('codeSpans')(tableLines[i], options, globals);
        }

        var rawHeaders = tableLines[0].split('|').map(function (s) { return s.trim();}),
            rawStyles = tableLines[1].split('|').map(function (s) { return s.trim();}),
            rawCells = [],
            headers = [],
            styles = [],
            cells = [];

        tableLines.shift();
        tableLines.shift();

        for (i = 0; i < tableLines.length; ++i) {
          if (tableLines[i].trim() === '') {
            continue;
          }
          rawCells.push(
            tableLines[i]
              .split('|')
              .map(function (s) {
                return s.trim();
              })
          );
        }

        if (rawHeaders.length < rawStyles.length) {
          return rawTable;
        }

        for (i = 0; i < rawStyles.length; ++i) {
          styles.push(parseStyles(rawStyles[i]));
        }

        for (i = 0; i < rawHeaders.length; ++i) {
          if (showdown.helper.isUndefined(styles[i])) {
            styles[i] = '';
          }
          headers.push(parseHeaders(rawHeaders[i], styles[i]));
        }

        for (i = 0; i < rawCells.length; ++i) {
          var row = [];
          for (var ii = 0; ii < headers.length; ++ii) {
            if (showdown.helper.isUndefined(rawCells[i][ii])) ;
            row.push(parseCells(rawCells[i][ii], styles[ii]));
          }
          cells.push(row);
        }

        return buildTable(headers, cells);
      }

      text = globals.converter._dispatch('tables.before', text, options, globals);

      // find escaped pipe characters
      text = text.replace(/\\(\|)/g, showdown.helper.escapeCharactersCallback);

      // parse multi column tables
      text = text.replace(tableRgx, parseTable);

      // parse one column tables
      text = text.replace(singeColTblRgx, parseTable);

      text = globals.converter._dispatch('tables.after', text, options, globals);

      return text;
    });

    showdown.subParser('underline', function (text, options, globals) {

      if (!options.underline) {
        return text;
      }

      text = globals.converter._dispatch('underline.before', text, options, globals);

      if (options.literalMidWordUnderscores) {
        text = text.replace(/\b___(\S[\s\S]*?)___\b/g, function (wm, txt) {
          return '<u>' + txt + '</u>';
        });
        text = text.replace(/\b__(\S[\s\S]*?)__\b/g, function (wm, txt) {
          return '<u>' + txt + '</u>';
        });
      } else {
        text = text.replace(/___(\S[\s\S]*?)___/g, function (wm, m) {
          return (/\S$/.test(m)) ? '<u>' + m + '</u>' : wm;
        });
        text = text.replace(/__(\S[\s\S]*?)__/g, function (wm, m) {
          return (/\S$/.test(m)) ? '<u>' + m + '</u>' : wm;
        });
      }

      // escape remaining underscores to prevent them being parsed by italic and bold
      text = text.replace(/(_)/g, showdown.helper.escapeCharactersCallback);

      text = globals.converter._dispatch('underline.after', text, options, globals);

      return text;
    });

    /**
     * Swap back in all the special characters we've hidden.
     */
    showdown.subParser('unescapeSpecialChars', function (text, options, globals) {
      text = globals.converter._dispatch('unescapeSpecialChars.before', text, options, globals);

      text = text.replace(/¨E(\d+)E/g, function (wholeMatch, m1) {
        var charCodeToReplace = parseInt(m1);
        return String.fromCharCode(charCodeToReplace);
      });

      text = globals.converter._dispatch('unescapeSpecialChars.after', text, options, globals);
      return text;
    });

    showdown.subParser('makeMarkdown.blockquote', function (node, globals) {

      var txt = '';
      if (node.hasChildNodes()) {
        var children = node.childNodes,
            childrenLength = children.length;

        for (var i = 0; i < childrenLength; ++i) {
          var innerTxt = showdown.subParser('makeMarkdown.node')(children[i], globals);

          if (innerTxt === '') {
            continue;
          }
          txt += innerTxt;
        }
      }
      // cleanup
      txt = txt.trim();
      txt = '> ' + txt.split('\n').join('\n> ');
      return txt;
    });

    showdown.subParser('makeMarkdown.codeBlock', function (node, globals) {

      var lang = node.getAttribute('language'),
          num  = node.getAttribute('precodenum');
      return '```' + lang + '\n' + globals.preList[num] + '\n```';
    });

    showdown.subParser('makeMarkdown.codeSpan', function (node) {

      return '`' + node.innerHTML + '`';
    });

    showdown.subParser('makeMarkdown.emphasis', function (node, globals) {

      var txt = '';
      if (node.hasChildNodes()) {
        txt += '*';
        var children = node.childNodes,
            childrenLength = children.length;
        for (var i = 0; i < childrenLength; ++i) {
          txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
        }
        txt += '*';
      }
      return txt;
    });

    showdown.subParser('makeMarkdown.header', function (node, globals, headerLevel) {

      var headerMark = new Array(headerLevel + 1).join('#'),
          txt = '';

      if (node.hasChildNodes()) {
        txt = headerMark + ' ';
        var children = node.childNodes,
            childrenLength = children.length;

        for (var i = 0; i < childrenLength; ++i) {
          txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
        }
      }
      return txt;
    });

    showdown.subParser('makeMarkdown.hr', function () {

      return '---';
    });

    showdown.subParser('makeMarkdown.image', function (node) {

      var txt = '';
      if (node.hasAttribute('src')) {
        txt += '![' + node.getAttribute('alt') + '](';
        txt += '<' + node.getAttribute('src') + '>';
        if (node.hasAttribute('width') && node.hasAttribute('height')) {
          txt += ' =' + node.getAttribute('width') + 'x' + node.getAttribute('height');
        }

        if (node.hasAttribute('title')) {
          txt += ' "' + node.getAttribute('title') + '"';
        }
        txt += ')';
      }
      return txt;
    });

    showdown.subParser('makeMarkdown.links', function (node, globals) {

      var txt = '';
      if (node.hasChildNodes() && node.hasAttribute('href')) {
        var children = node.childNodes,
            childrenLength = children.length;
        txt = '[';
        for (var i = 0; i < childrenLength; ++i) {
          txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
        }
        txt += '](';
        txt += '<' + node.getAttribute('href') + '>';
        if (node.hasAttribute('title')) {
          txt += ' "' + node.getAttribute('title') + '"';
        }
        txt += ')';
      }
      return txt;
    });

    showdown.subParser('makeMarkdown.list', function (node, globals, type) {

      var txt = '';
      if (!node.hasChildNodes()) {
        return '';
      }
      var listItems       = node.childNodes,
          listItemsLenght = listItems.length,
          listNum = node.getAttribute('start') || 1;

      for (var i = 0; i < listItemsLenght; ++i) {
        if (typeof listItems[i].tagName === 'undefined' || listItems[i].tagName.toLowerCase() !== 'li') {
          continue;
        }

        // define the bullet to use in list
        var bullet = '';
        if (type === 'ol') {
          bullet = listNum.toString() + '. ';
        } else {
          bullet = '- ';
        }

        // parse list item
        txt += bullet + showdown.subParser('makeMarkdown.listItem')(listItems[i], globals);
        ++listNum;
      }

      // add comment at the end to prevent consecutive lists to be parsed as one
      txt += '\n<!-- -->\n';
      return txt.trim();
    });

    showdown.subParser('makeMarkdown.listItem', function (node, globals) {

      var listItemTxt = '';

      var children = node.childNodes,
          childrenLenght = children.length;

      for (var i = 0; i < childrenLenght; ++i) {
        listItemTxt += showdown.subParser('makeMarkdown.node')(children[i], globals);
      }
      // if it's only one liner, we need to add a newline at the end
      if (!/\n$/.test(listItemTxt)) {
        listItemTxt += '\n';
      } else {
        // it's multiparagraph, so we need to indent
        listItemTxt = listItemTxt
          .split('\n')
          .join('\n    ')
          .replace(/^ {4}$/gm, '')
          .replace(/\n\n+/g, '\n\n');
      }

      return listItemTxt;
    });



    showdown.subParser('makeMarkdown.node', function (node, globals, spansOnly) {

      spansOnly = spansOnly || false;

      var txt = '';

      // edge case of text without wrapper paragraph
      if (node.nodeType === 3) {
        return showdown.subParser('makeMarkdown.txt')(node, globals);
      }

      // HTML comment
      if (node.nodeType === 8) {
        return '<!--' + node.data + '-->\n\n';
      }

      // process only node elements
      if (node.nodeType !== 1) {
        return '';
      }

      var tagName = node.tagName.toLowerCase();

      switch (tagName) {

        //
        // BLOCKS
        //
        case 'h1':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.header')(node, globals, 1) + '\n\n'; }
          break;
        case 'h2':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.header')(node, globals, 2) + '\n\n'; }
          break;
        case 'h3':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.header')(node, globals, 3) + '\n\n'; }
          break;
        case 'h4':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.header')(node, globals, 4) + '\n\n'; }
          break;
        case 'h5':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.header')(node, globals, 5) + '\n\n'; }
          break;
        case 'h6':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.header')(node, globals, 6) + '\n\n'; }
          break;

        case 'p':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.paragraph')(node, globals) + '\n\n'; }
          break;

        case 'blockquote':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.blockquote')(node, globals) + '\n\n'; }
          break;

        case 'hr':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.hr')(node, globals) + '\n\n'; }
          break;

        case 'ol':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.list')(node, globals, 'ol') + '\n\n'; }
          break;

        case 'ul':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.list')(node, globals, 'ul') + '\n\n'; }
          break;

        case 'precode':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.codeBlock')(node, globals) + '\n\n'; }
          break;

        case 'pre':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.pre')(node, globals) + '\n\n'; }
          break;

        case 'table':
          if (!spansOnly) { txt = showdown.subParser('makeMarkdown.table')(node, globals) + '\n\n'; }
          break;

        //
        // SPANS
        //
        case 'code':
          txt = showdown.subParser('makeMarkdown.codeSpan')(node, globals);
          break;

        case 'em':
        case 'i':
          txt = showdown.subParser('makeMarkdown.emphasis')(node, globals);
          break;

        case 'strong':
        case 'b':
          txt = showdown.subParser('makeMarkdown.strong')(node, globals);
          break;

        case 'del':
          txt = showdown.subParser('makeMarkdown.strikethrough')(node, globals);
          break;

        case 'a':
          txt = showdown.subParser('makeMarkdown.links')(node, globals);
          break;

        case 'img':
          txt = showdown.subParser('makeMarkdown.image')(node, globals);
          break;

        default:
          txt = node.outerHTML + '\n\n';
      }

      // common normalization
      // TODO eventually

      return txt;
    });

    showdown.subParser('makeMarkdown.paragraph', function (node, globals) {

      var txt = '';
      if (node.hasChildNodes()) {
        var children = node.childNodes,
            childrenLength = children.length;
        for (var i = 0; i < childrenLength; ++i) {
          txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
        }
      }

      // some text normalization
      txt = txt.trim();

      return txt;
    });

    showdown.subParser('makeMarkdown.pre', function (node, globals) {

      var num  = node.getAttribute('prenum');
      return '<pre>' + globals.preList[num] + '</pre>';
    });

    showdown.subParser('makeMarkdown.strikethrough', function (node, globals) {

      var txt = '';
      if (node.hasChildNodes()) {
        txt += '~~';
        var children = node.childNodes,
            childrenLength = children.length;
        for (var i = 0; i < childrenLength; ++i) {
          txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
        }
        txt += '~~';
      }
      return txt;
    });

    showdown.subParser('makeMarkdown.strong', function (node, globals) {

      var txt = '';
      if (node.hasChildNodes()) {
        txt += '**';
        var children = node.childNodes,
            childrenLength = children.length;
        for (var i = 0; i < childrenLength; ++i) {
          txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
        }
        txt += '**';
      }
      return txt;
    });

    showdown.subParser('makeMarkdown.table', function (node, globals) {

      var txt = '',
          tableArray = [[], []],
          headings   = node.querySelectorAll('thead>tr>th'),
          rows       = node.querySelectorAll('tbody>tr'),
          i, ii;
      for (i = 0; i < headings.length; ++i) {
        var headContent = showdown.subParser('makeMarkdown.tableCell')(headings[i], globals),
            allign = '---';

        if (headings[i].hasAttribute('style')) {
          var style = headings[i].getAttribute('style').toLowerCase().replace(/\s/g, '');
          switch (style) {
            case 'text-align:left;':
              allign = ':---';
              break;
            case 'text-align:right;':
              allign = '---:';
              break;
            case 'text-align:center;':
              allign = ':---:';
              break;
          }
        }
        tableArray[0][i] = headContent.trim();
        tableArray[1][i] = allign;
      }

      for (i = 0; i < rows.length; ++i) {
        var r = tableArray.push([]) - 1,
            cols = rows[i].getElementsByTagName('td');

        for (ii = 0; ii < headings.length; ++ii) {
          var cellContent = ' ';
          if (typeof cols[ii] !== 'undefined') {
            cellContent = showdown.subParser('makeMarkdown.tableCell')(cols[ii], globals);
          }
          tableArray[r].push(cellContent);
        }
      }

      var cellSpacesCount = 3;
      for (i = 0; i < tableArray.length; ++i) {
        for (ii = 0; ii < tableArray[i].length; ++ii) {
          var strLen = tableArray[i][ii].length;
          if (strLen > cellSpacesCount) {
            cellSpacesCount = strLen;
          }
        }
      }

      for (i = 0; i < tableArray.length; ++i) {
        for (ii = 0; ii < tableArray[i].length; ++ii) {
          if (i === 1) {
            if (tableArray[i][ii].slice(-1) === ':') {
              tableArray[i][ii] = showdown.helper.padEnd(tableArray[i][ii].slice(-1), cellSpacesCount - 1, '-') + ':';
            } else {
              tableArray[i][ii] = showdown.helper.padEnd(tableArray[i][ii], cellSpacesCount, '-');
            }
          } else {
            tableArray[i][ii] = showdown.helper.padEnd(tableArray[i][ii], cellSpacesCount);
          }
        }
        txt += '| ' + tableArray[i].join(' | ') + ' |\n';
      }

      return txt.trim();
    });

    showdown.subParser('makeMarkdown.tableCell', function (node, globals) {

      var txt = '';
      if (!node.hasChildNodes()) {
        return '';
      }
      var children = node.childNodes,
          childrenLength = children.length;

      for (var i = 0; i < childrenLength; ++i) {
        txt += showdown.subParser('makeMarkdown.node')(children[i], globals, true);
      }
      return txt.trim();
    });

    showdown.subParser('makeMarkdown.txt', function (node) {

      var txt = node.nodeValue;

      // multiple spaces are collapsed
      txt = txt.replace(/ +/g, ' ');

      // replace the custom ¨NBSP; with a space
      txt = txt.replace(/¨NBSP;/g, ' ');

      // ", <, > and & should replace escaped html entities
      txt = showdown.helper.unescapeHTMLEntities(txt);

      // escape markdown magic characters
      // emphasis, strong and strikethrough - can appear everywhere
      // we also escape pipe (|) because of tables
      // and escape ` because of code blocks and spans
      txt = txt.replace(/([*_~|`])/g, '\\$1');

      // escape > because of blockquotes
      txt = txt.replace(/^(\s*)>/g, '\\$1>');

      // hash character, only troublesome at the beginning of a line because of headers
      txt = txt.replace(/^#/gm, '\\#');

      // horizontal rules
      txt = txt.replace(/^(\s*)([-=]{3,})(\s*)$/, '$1\\$2$3');

      // dot, because of ordered lists, only troublesome at the beginning of a line when preceded by an integer
      txt = txt.replace(/^( {0,3}\d+)\./gm, '$1\\.');

      // +, * and -, at the beginning of a line becomes a list, so we need to escape them also (asterisk was already escaped)
      txt = txt.replace(/^( {0,3})([+-])/gm, '$1\\$2');

      // images and links, ] followed by ( is problematic, so we escape it
      txt = txt.replace(/]([\s]*)\(/g, '\\]$1\\(');

      // reference URIs must also be escaped
      txt = txt.replace(/^ {0,3}\[([\S \t]*?)]:/gm, '\\[$1]:');

      return txt;
    });

    var root = this;

    // AMD Loader
    if (module.exports) {
      module.exports = showdown;

    // Regular Browser loader
    } else {
      root.showdown = showdown;
    }
    }).call(commonjsGlobal);


    });

    /*! @license DOMPurify 2.3.4 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/2.3.4/LICENSE */

    var purify = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
      module.exports = factory() ;
    }(commonjsGlobal, function () {
      function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

      var hasOwnProperty = Object.hasOwnProperty,
          setPrototypeOf = Object.setPrototypeOf,
          isFrozen = Object.isFrozen,
          getPrototypeOf = Object.getPrototypeOf,
          getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      var freeze = Object.freeze,
          seal = Object.seal,
          create = Object.create; // eslint-disable-line import/no-mutable-exports

      var _ref = typeof Reflect !== 'undefined' && Reflect,
          apply = _ref.apply,
          construct = _ref.construct;

      if (!apply) {
        apply = function apply(fun, thisValue, args) {
          return fun.apply(thisValue, args);
        };
      }

      if (!freeze) {
        freeze = function freeze(x) {
          return x;
        };
      }

      if (!seal) {
        seal = function seal(x) {
          return x;
        };
      }

      if (!construct) {
        construct = function construct(Func, args) {
          return new (Function.prototype.bind.apply(Func, [null].concat(_toConsumableArray(args))))();
        };
      }

      var arrayForEach = unapply(Array.prototype.forEach);
      var arrayPop = unapply(Array.prototype.pop);
      var arrayPush = unapply(Array.prototype.push);

      var stringToLowerCase = unapply(String.prototype.toLowerCase);
      var stringMatch = unapply(String.prototype.match);
      var stringReplace = unapply(String.prototype.replace);
      var stringIndexOf = unapply(String.prototype.indexOf);
      var stringTrim = unapply(String.prototype.trim);

      var regExpTest = unapply(RegExp.prototype.test);

      var typeErrorCreate = unconstruct(TypeError);

      function unapply(func) {
        return function (thisArg) {
          for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          return apply(func, thisArg, args);
        };
      }

      function unconstruct(func) {
        return function () {
          for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          return construct(func, args);
        };
      }

      /* Add properties to a lookup table */
      function addToSet(set, array) {
        if (setPrototypeOf) {
          // Make 'in' and truthy checks like Boolean(set.constructor)
          // independent of any properties defined on Object.prototype.
          // Prevent prototype setters from intercepting set as a this value.
          setPrototypeOf(set, null);
        }

        var l = array.length;
        while (l--) {
          var element = array[l];
          if (typeof element === 'string') {
            var lcElement = stringToLowerCase(element);
            if (lcElement !== element) {
              // Config presets (e.g. tags.js, attrs.js) are immutable.
              if (!isFrozen(array)) {
                array[l] = lcElement;
              }

              element = lcElement;
            }
          }

          set[element] = true;
        }

        return set;
      }

      /* Shallow clone an object */
      function clone(object) {
        var newObject = create(null);

        var property = void 0;
        for (property in object) {
          if (apply(hasOwnProperty, object, [property])) {
            newObject[property] = object[property];
          }
        }

        return newObject;
      }

      /* IE10 doesn't support __lookupGetter__ so lets'
       * simulate it. It also automatically checks
       * if the prop is function or getter and behaves
       * accordingly. */
      function lookupGetter(object, prop) {
        while (object !== null) {
          var desc = getOwnPropertyDescriptor(object, prop);
          if (desc) {
            if (desc.get) {
              return unapply(desc.get);
            }

            if (typeof desc.value === 'function') {
              return unapply(desc.value);
            }
          }

          object = getPrototypeOf(object);
        }

        function fallbackValue(element) {
          console.warn('fallback value for', element);
          return null;
        }

        return fallbackValue;
      }

      var html = freeze(['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'shadow', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr']);

      // SVG
      var svg = freeze(['svg', 'a', 'altglyph', 'altglyphdef', 'altglyphitem', 'animatecolor', 'animatemotion', 'animatetransform', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'filter', 'font', 'g', 'glyph', 'glyphref', 'hkern', 'image', 'line', 'lineargradient', 'marker', 'mask', 'metadata', 'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'style', 'switch', 'symbol', 'text', 'textpath', 'title', 'tref', 'tspan', 'view', 'vkern']);

      var svgFilters = freeze(['feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);

      // List of SVG elements that are disallowed by default.
      // We still need to know them so that we can do namespace
      // checks properly in case one wants to add them to
      // allow-list.
      var svgDisallowed = freeze(['animate', 'color-profile', 'cursor', 'discard', 'fedropshadow', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri', 'foreignobject', 'hatch', 'hatchpath', 'mesh', 'meshgradient', 'meshpatch', 'meshrow', 'missing-glyph', 'script', 'set', 'solidcolor', 'unknown', 'use']);

      var mathMl = freeze(['math', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover']);

      // Similarly to SVG, we want to know all MathML elements,
      // even those that we disallow by default.
      var mathMlDisallowed = freeze(['maction', 'maligngroup', 'malignmark', 'mlongdiv', 'mscarries', 'mscarry', 'msgroup', 'mstack', 'msline', 'msrow', 'semantics', 'annotation', 'annotation-xml', 'mprescripts', 'none']);

      var text = freeze(['#text']);

      var html$1 = freeze(['accept', 'action', 'align', 'alt', 'autocapitalize', 'autocomplete', 'autopictureinpicture', 'autoplay', 'background', 'bgcolor', 'border', 'capture', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'clear', 'color', 'cols', 'colspan', 'controls', 'controlslist', 'coords', 'crossorigin', 'datetime', 'decoding', 'default', 'dir', 'disabled', 'disablepictureinpicture', 'disableremoteplayback', 'download', 'draggable', 'enctype', 'enterkeyhint', 'face', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'inputmode', 'integrity', 'ismap', 'kind', 'label', 'lang', 'list', 'loading', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'muted', 'name', 'nonce', 'noshade', 'novalidate', 'nowrap', 'open', 'optimum', 'pattern', 'placeholder', 'playsinline', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'rev', 'reversed', 'role', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'sizes', 'span', 'srclang', 'start', 'src', 'srcset', 'step', 'style', 'summary', 'tabindex', 'title', 'translate', 'type', 'usemap', 'valign', 'value', 'width', 'xmlns', 'slot']);

      var svg$1 = freeze(['accent-height', 'accumulate', 'additive', 'alignment-baseline', 'ascent', 'attributename', 'attributetype', 'azimuth', 'basefrequency', 'baseline-shift', 'begin', 'bias', 'by', 'class', 'clip', 'clippathunits', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cx', 'cy', 'd', 'dx', 'dy', 'diffuseconstant', 'direction', 'display', 'divisor', 'dur', 'edgemode', 'elevation', 'end', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterunits', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'fx', 'fy', 'g1', 'g2', 'glyph-name', 'glyphref', 'gradientunits', 'gradienttransform', 'height', 'href', 'id', 'image-rendering', 'in', 'in2', 'k', 'k1', 'k2', 'k3', 'k4', 'kerning', 'keypoints', 'keysplines', 'keytimes', 'lang', 'lengthadjust', 'letter-spacing', 'kernelmatrix', 'kernelunitlength', 'lighting-color', 'local', 'marker-end', 'marker-mid', 'marker-start', 'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'max', 'mask', 'media', 'method', 'mode', 'min', 'name', 'numoctaves', 'offset', 'operator', 'opacity', 'order', 'orient', 'orientation', 'origin', 'overflow', 'paint-order', 'path', 'pathlength', 'patterncontentunits', 'patterntransform', 'patternunits', 'points', 'preservealpha', 'preserveaspectratio', 'primitiveunits', 'r', 'rx', 'ry', 'radius', 'refx', 'refy', 'repeatcount', 'repeatdur', 'restart', 'result', 'rotate', 'scale', 'seed', 'shape-rendering', 'specularconstant', 'specularexponent', 'spreadmethod', 'startoffset', 'stddeviation', 'stitchtiles', 'stop-color', 'stop-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke', 'stroke-width', 'style', 'surfacescale', 'systemlanguage', 'tabindex', 'targetx', 'targety', 'transform', 'text-anchor', 'text-decoration', 'text-rendering', 'textlength', 'type', 'u1', 'u2', 'unicode', 'values', 'viewbox', 'visibility', 'version', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'width', 'word-spacing', 'wrap', 'writing-mode', 'xchannelselector', 'ychannelselector', 'x', 'x1', 'x2', 'xmlns', 'y', 'y1', 'y2', 'z', 'zoomandpan']);

      var mathMl$1 = freeze(['accent', 'accentunder', 'align', 'bevelled', 'close', 'columnsalign', 'columnlines', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'displaystyle', 'encoding', 'fence', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linethickness', 'lspace', 'lquote', 'mathbackground', 'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'movablelimits', 'notation', 'numalign', 'open', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptlevel', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'separators', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xmlns']);

      var xml = freeze(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']);

      // eslint-disable-next-line unicorn/better-regex
      var MUSTACHE_EXPR = seal(/\{\{[\s\S]*|[\s\S]*\}\}/gm); // Specify template detection regex for SAFE_FOR_TEMPLATES mode
      var ERB_EXPR = seal(/<%[\s\S]*|[\s\S]*%>/gm);
      var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]/); // eslint-disable-line no-useless-escape
      var ARIA_ATTR = seal(/^aria-[\-\w]+$/); // eslint-disable-line no-useless-escape
      var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i // eslint-disable-line no-useless-escape
      );
      var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
      var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g // eslint-disable-line no-control-regex
      );

      var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

      function _toConsumableArray$1(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

      var getGlobal = function getGlobal() {
        return typeof window === 'undefined' ? null : window;
      };

      /**
       * Creates a no-op policy for internal use only.
       * Don't export this function outside this module!
       * @param {?TrustedTypePolicyFactory} trustedTypes The policy factory.
       * @param {Document} document The document object (to determine policy name suffix)
       * @return {?TrustedTypePolicy} The policy created (or null, if Trusted Types
       * are not supported).
       */
      var _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, document) {
        if ((typeof trustedTypes === 'undefined' ? 'undefined' : _typeof(trustedTypes)) !== 'object' || typeof trustedTypes.createPolicy !== 'function') {
          return null;
        }

        // Allow the callers to control the unique policy name
        // by adding a data-tt-policy-suffix to the script element with the DOMPurify.
        // Policy creation with duplicate names throws in Trusted Types.
        var suffix = null;
        var ATTR_NAME = 'data-tt-policy-suffix';
        if (document.currentScript && document.currentScript.hasAttribute(ATTR_NAME)) {
          suffix = document.currentScript.getAttribute(ATTR_NAME);
        }

        var policyName = 'dompurify' + (suffix ? '#' + suffix : '');

        try {
          return trustedTypes.createPolicy(policyName, {
            createHTML: function createHTML(html$$1) {
              return html$$1;
            }
          });
        } catch (_) {
          // Policy creation failed (most likely another DOMPurify script has
          // already run). Skip creating the policy, as this will only cause errors
          // if TT are enforced.
          console.warn('TrustedTypes policy ' + policyName + ' could not be created.');
          return null;
        }
      };

      function createDOMPurify() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();

        var DOMPurify = function DOMPurify(root) {
          return createDOMPurify(root);
        };

        /**
         * Version label, exposed for easier checks
         * if DOMPurify is up to date or not
         */
        DOMPurify.version = '2.3.4';

        /**
         * Array of elements that DOMPurify removed during sanitation.
         * Empty if nothing was removed.
         */
        DOMPurify.removed = [];

        if (!window || !window.document || window.document.nodeType !== 9) {
          // Not running in a browser, provide a factory function
          // so that you can pass your own Window
          DOMPurify.isSupported = false;

          return DOMPurify;
        }

        var originalDocument = window.document;

        var document = window.document;
        var DocumentFragment = window.DocumentFragment,
            HTMLTemplateElement = window.HTMLTemplateElement,
            Node = window.Node,
            Element = window.Element,
            NodeFilter = window.NodeFilter,
            _window$NamedNodeMap = window.NamedNodeMap,
            NamedNodeMap = _window$NamedNodeMap === undefined ? window.NamedNodeMap || window.MozNamedAttrMap : _window$NamedNodeMap,
            HTMLFormElement = window.HTMLFormElement,
            DOMParser = window.DOMParser,
            trustedTypes = window.trustedTypes;


        var ElementPrototype = Element.prototype;

        var cloneNode = lookupGetter(ElementPrototype, 'cloneNode');
        var getNextSibling = lookupGetter(ElementPrototype, 'nextSibling');
        var getChildNodes = lookupGetter(ElementPrototype, 'childNodes');
        var getParentNode = lookupGetter(ElementPrototype, 'parentNode');

        // As per issue #47, the web-components registry is inherited by a
        // new document created via createHTMLDocument. As per the spec
        // (http://w3c.github.io/webcomponents/spec/custom/#creating-and-passing-registries)
        // a new empty registry is used when creating a template contents owner
        // document, so we use that as our parent document to ensure nothing
        // is inherited.
        if (typeof HTMLTemplateElement === 'function') {
          var template = document.createElement('template');
          if (template.content && template.content.ownerDocument) {
            document = template.content.ownerDocument;
          }
        }

        var trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, originalDocument);
        var emptyHTML = trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML('') : '';

        var _document = document,
            implementation = _document.implementation,
            createNodeIterator = _document.createNodeIterator,
            createDocumentFragment = _document.createDocumentFragment,
            getElementsByTagName = _document.getElementsByTagName;
        var importNode = originalDocument.importNode;


        var documentMode = {};
        try {
          documentMode = clone(document).documentMode ? document.documentMode : {};
        } catch (_) {}

        var hooks = {};

        /**
         * Expose whether this browser supports running the full DOMPurify.
         */
        DOMPurify.isSupported = typeof getParentNode === 'function' && implementation && typeof implementation.createHTMLDocument !== 'undefined' && documentMode !== 9;

        var MUSTACHE_EXPR$$1 = MUSTACHE_EXPR,
            ERB_EXPR$$1 = ERB_EXPR,
            DATA_ATTR$$1 = DATA_ATTR,
            ARIA_ATTR$$1 = ARIA_ATTR,
            IS_SCRIPT_OR_DATA$$1 = IS_SCRIPT_OR_DATA,
            ATTR_WHITESPACE$$1 = ATTR_WHITESPACE;
        var IS_ALLOWED_URI$$1 = IS_ALLOWED_URI;

        /**
         * We consider the elements and attributes below to be safe. Ideally
         * don't add any new ones but feel free to remove unwanted ones.
         */

        /* allowed element names */

        var ALLOWED_TAGS = null;
        var DEFAULT_ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray$1(html), _toConsumableArray$1(svg), _toConsumableArray$1(svgFilters), _toConsumableArray$1(mathMl), _toConsumableArray$1(text)));

        /* Allowed attribute names */
        var ALLOWED_ATTR = null;
        var DEFAULT_ALLOWED_ATTR = addToSet({}, [].concat(_toConsumableArray$1(html$1), _toConsumableArray$1(svg$1), _toConsumableArray$1(mathMl$1), _toConsumableArray$1(xml)));

        /*
         * Configure how DOMPUrify should handle custom elements and their attributes as well as customized built-in elements.
         * @property {RegExp|Function|null} tagNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any custom elements)
         * @property {RegExp|Function|null} attributeNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any attributes not on the allow list)
         * @property {boolean} allowCustomizedBuiltInElements allow custom elements derived from built-ins if they pass CUSTOM_ELEMENT_HANDLING.tagNameCheck. Default: `false`.
         */
        var CUSTOM_ELEMENT_HANDLING = Object.seal(Object.create(null, {
          tagNameCheck: {
            writable: true,
            configurable: false,
            enumerable: true,
            value: null
          },
          attributeNameCheck: {
            writable: true,
            configurable: false,
            enumerable: true,
            value: null
          },
          allowCustomizedBuiltInElements: {
            writable: true,
            configurable: false,
            enumerable: true,
            value: false
          }
        }));

        /* Explicitly forbidden tags (overrides ALLOWED_TAGS/ADD_TAGS) */
        var FORBID_TAGS = null;

        /* Explicitly forbidden attributes (overrides ALLOWED_ATTR/ADD_ATTR) */
        var FORBID_ATTR = null;

        /* Decide if ARIA attributes are okay */
        var ALLOW_ARIA_ATTR = true;

        /* Decide if custom data attributes are okay */
        var ALLOW_DATA_ATTR = true;

        /* Decide if unknown protocols are okay */
        var ALLOW_UNKNOWN_PROTOCOLS = false;

        /* Output should be safe for common template engines.
         * This means, DOMPurify removes data attributes, mustaches and ERB
         */
        var SAFE_FOR_TEMPLATES = false;

        /* Decide if document with <html>... should be returned */
        var WHOLE_DOCUMENT = false;

        /* Track whether config is already set on this instance of DOMPurify. */
        var SET_CONFIG = false;

        /* Decide if all elements (e.g. style, script) must be children of
         * document.body. By default, browsers might move them to document.head */
        var FORCE_BODY = false;

        /* Decide if a DOM `HTMLBodyElement` should be returned, instead of a html
         * string (or a TrustedHTML object if Trusted Types are supported).
         * If `WHOLE_DOCUMENT` is enabled a `HTMLHtmlElement` will be returned instead
         */
        var RETURN_DOM = false;

        /* Decide if a DOM `DocumentFragment` should be returned, instead of a html
         * string  (or a TrustedHTML object if Trusted Types are supported) */
        var RETURN_DOM_FRAGMENT = false;

        /* Try to return a Trusted Type object instead of a string, return a string in
         * case Trusted Types are not supported  */
        var RETURN_TRUSTED_TYPE = false;

        /* Output should be free from DOM clobbering attacks? */
        var SANITIZE_DOM = true;

        /* Keep element content when removing element? */
        var KEEP_CONTENT = true;

        /* If a `Node` is passed to sanitize(), then performs sanitization in-place instead
         * of importing it into a new Document and returning a sanitized copy */
        var IN_PLACE = false;

        /* Allow usage of profiles like html, svg and mathMl */
        var USE_PROFILES = {};

        /* Tags to ignore content of when KEEP_CONTENT is true */
        var FORBID_CONTENTS = null;
        var DEFAULT_FORBID_CONTENTS = addToSet({}, ['annotation-xml', 'audio', 'colgroup', 'desc', 'foreignobject', 'head', 'iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'noembed', 'noframes', 'noscript', 'plaintext', 'script', 'style', 'svg', 'template', 'thead', 'title', 'video', 'xmp']);

        /* Tags that are safe for data: URIs */
        var DATA_URI_TAGS = null;
        var DEFAULT_DATA_URI_TAGS = addToSet({}, ['audio', 'video', 'img', 'source', 'image', 'track']);

        /* Attributes safe for values like "javascript:" */
        var URI_SAFE_ATTRIBUTES = null;
        var DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ['alt', 'class', 'for', 'id', 'label', 'name', 'pattern', 'placeholder', 'role', 'summary', 'title', 'value', 'style', 'xmlns']);

        var MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
        var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
        var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
        /* Document namespace */
        var NAMESPACE = HTML_NAMESPACE;
        var IS_EMPTY_INPUT = false;

        /* Parsing of strict XHTML documents */
        var PARSER_MEDIA_TYPE = void 0;
        var SUPPORTED_PARSER_MEDIA_TYPES = ['application/xhtml+xml', 'text/html'];
        var DEFAULT_PARSER_MEDIA_TYPE = 'text/html';
        var transformCaseFunc = void 0;

        /* Keep a reference to config to pass to hooks */
        var CONFIG = null;

        /* Ideally, do not touch anything below this line */
        /* ______________________________________________ */

        var formElement = document.createElement('form');

        var isRegexOrFunction = function isRegexOrFunction(testValue) {
          return testValue instanceof RegExp || testValue instanceof Function;
        };

        /**
         * _parseConfig
         *
         * @param  {Object} cfg optional config literal
         */
        // eslint-disable-next-line complexity
        var _parseConfig = function _parseConfig(cfg) {
          if (CONFIG && CONFIG === cfg) {
            return;
          }

          /* Shield configuration object from tampering */
          if (!cfg || (typeof cfg === 'undefined' ? 'undefined' : _typeof(cfg)) !== 'object') {
            cfg = {};
          }

          /* Shield configuration object from prototype pollution */
          cfg = clone(cfg);

          /* Set configuration parameters */
          ALLOWED_TAGS = 'ALLOWED_TAGS' in cfg ? addToSet({}, cfg.ALLOWED_TAGS) : DEFAULT_ALLOWED_TAGS;
          ALLOWED_ATTR = 'ALLOWED_ATTR' in cfg ? addToSet({}, cfg.ALLOWED_ATTR) : DEFAULT_ALLOWED_ATTR;
          URI_SAFE_ATTRIBUTES = 'ADD_URI_SAFE_ATTR' in cfg ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR) : DEFAULT_URI_SAFE_ATTRIBUTES;
          DATA_URI_TAGS = 'ADD_DATA_URI_TAGS' in cfg ? addToSet(clone(DEFAULT_DATA_URI_TAGS), cfg.ADD_DATA_URI_TAGS) : DEFAULT_DATA_URI_TAGS;
          FORBID_CONTENTS = 'FORBID_CONTENTS' in cfg ? addToSet({}, cfg.FORBID_CONTENTS) : DEFAULT_FORBID_CONTENTS;
          FORBID_TAGS = 'FORBID_TAGS' in cfg ? addToSet({}, cfg.FORBID_TAGS) : {};
          FORBID_ATTR = 'FORBID_ATTR' in cfg ? addToSet({}, cfg.FORBID_ATTR) : {};
          USE_PROFILES = 'USE_PROFILES' in cfg ? cfg.USE_PROFILES : false;
          ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false; // Default true
          ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false; // Default true
          ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false; // Default false
          SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false; // Default false
          WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false; // Default false
          RETURN_DOM = cfg.RETURN_DOM || false; // Default false
          RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false; // Default false
          RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false; // Default false
          FORCE_BODY = cfg.FORCE_BODY || false; // Default false
          SANITIZE_DOM = cfg.SANITIZE_DOM !== false; // Default true
          KEEP_CONTENT = cfg.KEEP_CONTENT !== false; // Default true
          IN_PLACE = cfg.IN_PLACE || false; // Default false
          IS_ALLOWED_URI$$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI$$1;
          NAMESPACE = cfg.NAMESPACE || HTML_NAMESPACE;
          if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck)) {
            CUSTOM_ELEMENT_HANDLING.tagNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck;
          }

          if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)) {
            CUSTOM_ELEMENT_HANDLING.attributeNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck;
          }

          if (cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements === 'boolean') {
            CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements;
          }

          PARSER_MEDIA_TYPE =
          // eslint-disable-next-line unicorn/prefer-includes
          SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? PARSER_MEDIA_TYPE = DEFAULT_PARSER_MEDIA_TYPE : PARSER_MEDIA_TYPE = cfg.PARSER_MEDIA_TYPE;

          // HTML tags and attributes are not case-sensitive, converting to lowercase. Keeping XHTML as is.
          transformCaseFunc = PARSER_MEDIA_TYPE === 'application/xhtml+xml' ? function (x) {
            return x;
          } : stringToLowerCase;

          if (SAFE_FOR_TEMPLATES) {
            ALLOW_DATA_ATTR = false;
          }

          if (RETURN_DOM_FRAGMENT) {
            RETURN_DOM = true;
          }

          /* Parse profile info */
          if (USE_PROFILES) {
            ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray$1(text)));
            ALLOWED_ATTR = [];
            if (USE_PROFILES.html === true) {
              addToSet(ALLOWED_TAGS, html);
              addToSet(ALLOWED_ATTR, html$1);
            }

            if (USE_PROFILES.svg === true) {
              addToSet(ALLOWED_TAGS, svg);
              addToSet(ALLOWED_ATTR, svg$1);
              addToSet(ALLOWED_ATTR, xml);
            }

            if (USE_PROFILES.svgFilters === true) {
              addToSet(ALLOWED_TAGS, svgFilters);
              addToSet(ALLOWED_ATTR, svg$1);
              addToSet(ALLOWED_ATTR, xml);
            }

            if (USE_PROFILES.mathMl === true) {
              addToSet(ALLOWED_TAGS, mathMl);
              addToSet(ALLOWED_ATTR, mathMl$1);
              addToSet(ALLOWED_ATTR, xml);
            }
          }

          /* Merge configuration parameters */
          if (cfg.ADD_TAGS) {
            if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
              ALLOWED_TAGS = clone(ALLOWED_TAGS);
            }

            addToSet(ALLOWED_TAGS, cfg.ADD_TAGS);
          }

          if (cfg.ADD_ATTR) {
            if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
              ALLOWED_ATTR = clone(ALLOWED_ATTR);
            }

            addToSet(ALLOWED_ATTR, cfg.ADD_ATTR);
          }

          if (cfg.ADD_URI_SAFE_ATTR) {
            addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR);
          }

          if (cfg.FORBID_CONTENTS) {
            if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
              FORBID_CONTENTS = clone(FORBID_CONTENTS);
            }

            addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS);
          }

          /* Add #text in case KEEP_CONTENT is set to true */
          if (KEEP_CONTENT) {
            ALLOWED_TAGS['#text'] = true;
          }

          /* Add html, head and body to ALLOWED_TAGS in case WHOLE_DOCUMENT is true */
          if (WHOLE_DOCUMENT) {
            addToSet(ALLOWED_TAGS, ['html', 'head', 'body']);
          }

          /* Add tbody to ALLOWED_TAGS in case tables are permitted, see #286, #365 */
          if (ALLOWED_TAGS.table) {
            addToSet(ALLOWED_TAGS, ['tbody']);
            delete FORBID_TAGS.tbody;
          }

          // Prevent further manipulation of configuration.
          // Not available in IE8, Safari 5, etc.
          if (freeze) {
            freeze(cfg);
          }

          CONFIG = cfg;
        };

        var MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ['mi', 'mo', 'mn', 'ms', 'mtext']);

        var HTML_INTEGRATION_POINTS = addToSet({}, ['foreignobject', 'desc', 'title', 'annotation-xml']);

        /* Keep track of all possible SVG and MathML tags
         * so that we can perform the namespace checks
         * correctly. */
        var ALL_SVG_TAGS = addToSet({}, svg);
        addToSet(ALL_SVG_TAGS, svgFilters);
        addToSet(ALL_SVG_TAGS, svgDisallowed);

        var ALL_MATHML_TAGS = addToSet({}, mathMl);
        addToSet(ALL_MATHML_TAGS, mathMlDisallowed);

        /**
         *
         *
         * @param  {Element} element a DOM element whose namespace is being checked
         * @returns {boolean} Return false if the element has a
         *  namespace that a spec-compliant parser would never
         *  return. Return true otherwise.
         */
        var _checkValidNamespace = function _checkValidNamespace(element) {
          var parent = getParentNode(element);

          // In JSDOM, if we're inside shadow DOM, then parentNode
          // can be null. We just simulate parent in this case.
          if (!parent || !parent.tagName) {
            parent = {
              namespaceURI: HTML_NAMESPACE,
              tagName: 'template'
            };
          }

          var tagName = stringToLowerCase(element.tagName);
          var parentTagName = stringToLowerCase(parent.tagName);

          if (element.namespaceURI === SVG_NAMESPACE) {
            // The only way to switch from HTML namespace to SVG
            // is via <svg>. If it happens via any other tag, then
            // it should be killed.
            if (parent.namespaceURI === HTML_NAMESPACE) {
              return tagName === 'svg';
            }

            // The only way to switch from MathML to SVG is via
            // svg if parent is either <annotation-xml> or MathML
            // text integration points.
            if (parent.namespaceURI === MATHML_NAMESPACE) {
              return tagName === 'svg' && (parentTagName === 'annotation-xml' || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
            }

            // We only allow elements that are defined in SVG
            // spec. All others are disallowed in SVG namespace.
            return Boolean(ALL_SVG_TAGS[tagName]);
          }

          if (element.namespaceURI === MATHML_NAMESPACE) {
            // The only way to switch from HTML namespace to MathML
            // is via <math>. If it happens via any other tag, then
            // it should be killed.
            if (parent.namespaceURI === HTML_NAMESPACE) {
              return tagName === 'math';
            }

            // The only way to switch from SVG to MathML is via
            // <math> and HTML integration points
            if (parent.namespaceURI === SVG_NAMESPACE) {
              return tagName === 'math' && HTML_INTEGRATION_POINTS[parentTagName];
            }

            // We only allow elements that are defined in MathML
            // spec. All others are disallowed in MathML namespace.
            return Boolean(ALL_MATHML_TAGS[tagName]);
          }

          if (element.namespaceURI === HTML_NAMESPACE) {
            // The only way to switch from SVG to HTML is via
            // HTML integration points, and from MathML to HTML
            // is via MathML text integration points
            if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
              return false;
            }

            if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
              return false;
            }

            // Certain elements are allowed in both SVG and HTML
            // namespace. We need to specify them explicitly
            // so that they don't get erronously deleted from
            // HTML namespace.
            var commonSvgAndHTMLElements = addToSet({}, ['title', 'style', 'font', 'a', 'script']);

            // We disallow tags that are specific for MathML
            // or SVG and should never appear in HTML namespace
            return !ALL_MATHML_TAGS[tagName] && (commonSvgAndHTMLElements[tagName] || !ALL_SVG_TAGS[tagName]);
          }

          // The code should never reach this place (this means
          // that the element somehow got namespace that is not
          // HTML, SVG or MathML). Return false just in case.
          return false;
        };

        /**
         * _forceRemove
         *
         * @param  {Node} node a DOM node
         */
        var _forceRemove = function _forceRemove(node) {
          arrayPush(DOMPurify.removed, { element: node });
          try {
            // eslint-disable-next-line unicorn/prefer-dom-node-remove
            node.parentNode.removeChild(node);
          } catch (_) {
            try {
              node.outerHTML = emptyHTML;
            } catch (_) {
              node.remove();
            }
          }
        };

        /**
         * _removeAttribute
         *
         * @param  {String} name an Attribute name
         * @param  {Node} node a DOM node
         */
        var _removeAttribute = function _removeAttribute(name, node) {
          try {
            arrayPush(DOMPurify.removed, {
              attribute: node.getAttributeNode(name),
              from: node
            });
          } catch (_) {
            arrayPush(DOMPurify.removed, {
              attribute: null,
              from: node
            });
          }

          node.removeAttribute(name);

          // We void attribute values for unremovable "is"" attributes
          if (name === 'is' && !ALLOWED_ATTR[name]) {
            if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
              try {
                _forceRemove(node);
              } catch (_) {}
            } else {
              try {
                node.setAttribute(name, '');
              } catch (_) {}
            }
          }
        };

        /**
         * _initDocument
         *
         * @param  {String} dirty a string of dirty markup
         * @return {Document} a DOM, filled with the dirty markup
         */
        var _initDocument = function _initDocument(dirty) {
          /* Create a HTML document */
          var doc = void 0;
          var leadingWhitespace = void 0;

          if (FORCE_BODY) {
            dirty = '<remove></remove>' + dirty;
          } else {
            /* If FORCE_BODY isn't used, leading whitespace needs to be preserved manually */
            var matches = stringMatch(dirty, /^[\r\n\t ]+/);
            leadingWhitespace = matches && matches[0];
          }

          if (PARSER_MEDIA_TYPE === 'application/xhtml+xml') {
            // Root of XHTML doc must contain xmlns declaration (see https://www.w3.org/TR/xhtml1/normative.html#strict)
            dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + '</body></html>';
          }

          var dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
          /*
           * Use the DOMParser API by default, fallback later if needs be
           * DOMParser not work for svg when has multiple root element.
           */
          if (NAMESPACE === HTML_NAMESPACE) {
            try {
              doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
            } catch (_) {}
          }

          /* Use createHTMLDocument in case DOMParser is not available */
          if (!doc || !doc.documentElement) {
            doc = implementation.createDocument(NAMESPACE, 'template', null);
            try {
              doc.documentElement.innerHTML = IS_EMPTY_INPUT ? '' : dirtyPayload;
            } catch (_) {
              // Syntax error if dirtyPayload is invalid xml
            }
          }

          var body = doc.body || doc.documentElement;

          if (dirty && leadingWhitespace) {
            body.insertBefore(document.createTextNode(leadingWhitespace), body.childNodes[0] || null);
          }

          /* Work on whole document or just its body */
          if (NAMESPACE === HTML_NAMESPACE) {
            return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? 'html' : 'body')[0];
          }

          return WHOLE_DOCUMENT ? doc.documentElement : body;
        };

        /**
         * _createIterator
         *
         * @param  {Document} root document/fragment to create iterator for
         * @return {Iterator} iterator instance
         */
        var _createIterator = function _createIterator(root) {
          return createNodeIterator.call(root.ownerDocument || root, root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT, null, false);
        };

        /**
         * _isClobbered
         *
         * @param  {Node} elm element to check for clobbering attacks
         * @return {Boolean} true if clobbered, false if safe
         */
        var _isClobbered = function _isClobbered(elm) {
          return elm instanceof HTMLFormElement && (typeof elm.nodeName !== 'string' || typeof elm.textContent !== 'string' || typeof elm.removeChild !== 'function' || !(elm.attributes instanceof NamedNodeMap) || typeof elm.removeAttribute !== 'function' || typeof elm.setAttribute !== 'function' || typeof elm.namespaceURI !== 'string' || typeof elm.insertBefore !== 'function');
        };

        /**
         * _isNode
         *
         * @param  {Node} obj object to check whether it's a DOM node
         * @return {Boolean} true is object is a DOM node
         */
        var _isNode = function _isNode(object) {
          return (typeof Node === 'undefined' ? 'undefined' : _typeof(Node)) === 'object' ? object instanceof Node : object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && typeof object.nodeType === 'number' && typeof object.nodeName === 'string';
        };

        /**
         * _executeHook
         * Execute user configurable hooks
         *
         * @param  {String} entryPoint  Name of the hook's entry point
         * @param  {Node} currentNode node to work on with the hook
         * @param  {Object} data additional hook parameters
         */
        var _executeHook = function _executeHook(entryPoint, currentNode, data) {
          if (!hooks[entryPoint]) {
            return;
          }

          arrayForEach(hooks[entryPoint], function (hook) {
            hook.call(DOMPurify, currentNode, data, CONFIG);
          });
        };

        /**
         * _sanitizeElements
         *
         * @protect nodeName
         * @protect textContent
         * @protect removeChild
         *
         * @param   {Node} currentNode to check for permission to exist
         * @return  {Boolean} true if node was killed, false if left alive
         */
        var _sanitizeElements = function _sanitizeElements(currentNode) {
          var content = void 0;

          /* Execute a hook if present */
          _executeHook('beforeSanitizeElements', currentNode, null);

          /* Check if element is clobbered or can clobber */
          if (_isClobbered(currentNode)) {
            _forceRemove(currentNode);
            return true;
          }

          /* Check if tagname contains Unicode */
          if (stringMatch(currentNode.nodeName, /[\u0080-\uFFFF]/)) {
            _forceRemove(currentNode);
            return true;
          }

          /* Now let's check the element's type and name */
          var tagName = transformCaseFunc(currentNode.nodeName);

          /* Execute a hook if present */
          _executeHook('uponSanitizeElement', currentNode, {
            tagName: tagName,
            allowedTags: ALLOWED_TAGS
          });

          /* Detect mXSS attempts abusing namespace confusion */
          if (!_isNode(currentNode.firstElementChild) && (!_isNode(currentNode.content) || !_isNode(currentNode.content.firstElementChild)) && regExpTest(/<[/\w]/g, currentNode.innerHTML) && regExpTest(/<[/\w]/g, currentNode.textContent)) {
            _forceRemove(currentNode);
            return true;
          }

          /* Mitigate a problem with templates inside select */
          if (tagName === 'select' && regExpTest(/<template/i, currentNode.innerHTML)) {
            _forceRemove(currentNode);
            return true;
          }

          /* Remove element if anything forbids its presence */
          if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
            /* Keep content except for bad-listed elements */
            if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
              var parentNode = getParentNode(currentNode) || currentNode.parentNode;
              var childNodes = getChildNodes(currentNode) || currentNode.childNodes;

              if (childNodes && parentNode) {
                var childCount = childNodes.length;

                for (var i = childCount - 1; i >= 0; --i) {
                  parentNode.insertBefore(cloneNode(childNodes[i], true), getNextSibling(currentNode));
                }
              }
            }

            if (!FORBID_TAGS[tagName] && _basicCustomElementTest(tagName)) {
              if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) return false;
              if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName)) return false;
            }

            _forceRemove(currentNode);
            return true;
          }

          /* Check whether element has a valid namespace */
          if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
            _forceRemove(currentNode);
            return true;
          }

          if ((tagName === 'noscript' || tagName === 'noembed') && regExpTest(/<\/no(script|embed)/i, currentNode.innerHTML)) {
            _forceRemove(currentNode);
            return true;
          }

          /* Sanitize element content to be template-safe */
          if (SAFE_FOR_TEMPLATES && currentNode.nodeType === 3) {
            /* Get the element's text content */
            content = currentNode.textContent;
            content = stringReplace(content, MUSTACHE_EXPR$$1, ' ');
            content = stringReplace(content, ERB_EXPR$$1, ' ');
            if (currentNode.textContent !== content) {
              arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
              currentNode.textContent = content;
            }
          }

          /* Execute a hook if present */
          _executeHook('afterSanitizeElements', currentNode, null);

          return false;
        };

        /**
         * _isValidAttribute
         *
         * @param  {string} lcTag Lowercase tag name of containing element.
         * @param  {string} lcName Lowercase attribute name.
         * @param  {string} value Attribute value.
         * @return {Boolean} Returns true if `value` is valid, otherwise false.
         */
        // eslint-disable-next-line complexity
        var _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
          /* Make sure attribute cannot clobber */
          if (SANITIZE_DOM && (lcName === 'id' || lcName === 'name') && (value in document || value in formElement)) {
            return false;
          }

          /* Allow valid data-* attributes: At least one character after "-"
              (https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)
              XML-compatible (https://html.spec.whatwg.org/multipage/infrastructure.html#xml-compatible and http://www.w3.org/TR/xml/#d0e804)
              We don't need to check the value; it's always URI safe. */
          if (ALLOW_DATA_ATTR && !FORBID_ATTR[lcName] && regExpTest(DATA_ATTR$$1, lcName)) ; else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$$1, lcName)) ; else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
            if (
            // First condition does a very basic check if a) it's basically a valid custom element tagname AND
            // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
            // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
            _basicCustomElementTest(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName)) ||
            // Alternative, second condition checks if it's an `is`-attribute, AND
            // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
            lcName === 'is' && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value))) ; else {
              return false;
            }
            /* Check value is safe. First, is attr inert? If so, is safe */
          } else if (URI_SAFE_ATTRIBUTES[lcName]) ; else if (regExpTest(IS_ALLOWED_URI$$1, stringReplace(value, ATTR_WHITESPACE$$1, ''))) ; else if ((lcName === 'src' || lcName === 'xlink:href' || lcName === 'href') && lcTag !== 'script' && stringIndexOf(value, 'data:') === 0 && DATA_URI_TAGS[lcTag]) ; else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$$1, stringReplace(value, ATTR_WHITESPACE$$1, ''))) ; else if (!value) ; else {
            return false;
          }

          return true;
        };

        /**
         * _basicCustomElementCheck
         * checks if at least one dash is included in tagName, and it's not the first char
         * for more sophisticated checking see https://github.com/sindresorhus/validate-element-name
         * @param {string} tagName name of the tag of the node to sanitize
         */
        var _basicCustomElementTest = function _basicCustomElementTest(tagName) {
          return tagName.indexOf('-') > 0;
        };

        /**
         * _sanitizeAttributes
         *
         * @protect attributes
         * @protect nodeName
         * @protect removeAttribute
         * @protect setAttribute
         *
         * @param  {Node} currentNode to sanitize
         */
        var _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
          var attr = void 0;
          var value = void 0;
          var lcName = void 0;
          var l = void 0;
          /* Execute a hook if present */
          _executeHook('beforeSanitizeAttributes', currentNode, null);

          var attributes = currentNode.attributes;

          /* Check if we have attributes; if not we might have a text node */

          if (!attributes) {
            return;
          }

          var hookEvent = {
            attrName: '',
            attrValue: '',
            keepAttr: true,
            allowedAttributes: ALLOWED_ATTR
          };
          l = attributes.length;

          /* Go backwards over all attributes; safely remove bad ones */
          while (l--) {
            attr = attributes[l];
            var _attr = attr,
                name = _attr.name,
                namespaceURI = _attr.namespaceURI;

            value = stringTrim(attr.value);
            lcName = transformCaseFunc(name);

            /* Execute a hook if present */
            hookEvent.attrName = lcName;
            hookEvent.attrValue = value;
            hookEvent.keepAttr = true;
            hookEvent.forceKeepAttr = undefined; // Allows developers to see this is a property they can set
            _executeHook('uponSanitizeAttribute', currentNode, hookEvent);
            value = hookEvent.attrValue;
            /* Did the hooks approve of the attribute? */
            if (hookEvent.forceKeepAttr) {
              continue;
            }

            /* Remove attribute */
            _removeAttribute(name, currentNode);

            /* Did the hooks approve of the attribute? */
            if (!hookEvent.keepAttr) {
              continue;
            }

            /* Work around a security issue in jQuery 3.0 */
            if (regExpTest(/\/>/i, value)) {
              _removeAttribute(name, currentNode);
              continue;
            }

            /* Sanitize attribute content to be template-safe */
            if (SAFE_FOR_TEMPLATES) {
              value = stringReplace(value, MUSTACHE_EXPR$$1, ' ');
              value = stringReplace(value, ERB_EXPR$$1, ' ');
            }

            /* Is `value` valid for this attribute? */
            var lcTag = transformCaseFunc(currentNode.nodeName);
            if (!_isValidAttribute(lcTag, lcName, value)) {
              continue;
            }

            /* Handle invalid data-* attribute set by try-catching it */
            try {
              if (namespaceURI) {
                currentNode.setAttributeNS(namespaceURI, name, value);
              } else {
                /* Fallback to setAttribute() for browser-unrecognized namespaces e.g. "x-schema". */
                currentNode.setAttribute(name, value);
              }

              arrayPop(DOMPurify.removed);
            } catch (_) {}
          }

          /* Execute a hook if present */
          _executeHook('afterSanitizeAttributes', currentNode, null);
        };

        /**
         * _sanitizeShadowDOM
         *
         * @param  {DocumentFragment} fragment to iterate over recursively
         */
        var _sanitizeShadowDOM = function _sanitizeShadowDOM(fragment) {
          var shadowNode = void 0;
          var shadowIterator = _createIterator(fragment);

          /* Execute a hook if present */
          _executeHook('beforeSanitizeShadowDOM', fragment, null);

          while (shadowNode = shadowIterator.nextNode()) {
            /* Execute a hook if present */
            _executeHook('uponSanitizeShadowNode', shadowNode, null);

            /* Sanitize tags and elements */
            if (_sanitizeElements(shadowNode)) {
              continue;
            }

            /* Deep shadow DOM detected */
            if (shadowNode.content instanceof DocumentFragment) {
              _sanitizeShadowDOM(shadowNode.content);
            }

            /* Check attributes, sanitize if necessary */
            _sanitizeAttributes(shadowNode);
          }

          /* Execute a hook if present */
          _executeHook('afterSanitizeShadowDOM', fragment, null);
        };

        /**
         * Sanitize
         * Public method providing core sanitation functionality
         *
         * @param {String|Node} dirty string or DOM node
         * @param {Object} configuration object
         */
        // eslint-disable-next-line complexity
        DOMPurify.sanitize = function (dirty, cfg) {
          var body = void 0;
          var importedNode = void 0;
          var currentNode = void 0;
          var oldNode = void 0;
          var returnNode = void 0;
          /* Make sure we have a string to sanitize.
            DO NOT return early, as this will return the wrong type if
            the user has requested a DOM object rather than a string */
          IS_EMPTY_INPUT = !dirty;
          if (IS_EMPTY_INPUT) {
            dirty = '<!-->';
          }

          /* Stringify, in case dirty is an object */
          if (typeof dirty !== 'string' && !_isNode(dirty)) {
            // eslint-disable-next-line no-negated-condition
            if (typeof dirty.toString !== 'function') {
              throw typeErrorCreate('toString is not a function');
            } else {
              dirty = dirty.toString();
              if (typeof dirty !== 'string') {
                throw typeErrorCreate('dirty is not a string, aborting');
              }
            }
          }

          /* Check we can run. Otherwise fall back or ignore */
          if (!DOMPurify.isSupported) {
            if (_typeof(window.toStaticHTML) === 'object' || typeof window.toStaticHTML === 'function') {
              if (typeof dirty === 'string') {
                return window.toStaticHTML(dirty);
              }

              if (_isNode(dirty)) {
                return window.toStaticHTML(dirty.outerHTML);
              }
            }

            return dirty;
          }

          /* Assign config vars */
          if (!SET_CONFIG) {
            _parseConfig(cfg);
          }

          /* Clean up removed elements */
          DOMPurify.removed = [];

          /* Check if dirty is correctly typed for IN_PLACE */
          if (typeof dirty === 'string') {
            IN_PLACE = false;
          }

          if (IN_PLACE) ; else if (dirty instanceof Node) {
            /* If dirty is a DOM element, append to an empty document to avoid
               elements being stripped by the parser */
            body = _initDocument('<!---->');
            importedNode = body.ownerDocument.importNode(dirty, true);
            if (importedNode.nodeType === 1 && importedNode.nodeName === 'BODY') {
              /* Node is already a body, use as is */
              body = importedNode;
            } else if (importedNode.nodeName === 'HTML') {
              body = importedNode;
            } else {
              // eslint-disable-next-line unicorn/prefer-dom-node-append
              body.appendChild(importedNode);
            }
          } else {
            /* Exit directly if we have nothing to do */
            if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT &&
            // eslint-disable-next-line unicorn/prefer-includes
            dirty.indexOf('<') === -1) {
              return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
            }

            /* Initialize the document to work on */
            body = _initDocument(dirty);

            /* Check we have a DOM node from the data */
            if (!body) {
              return RETURN_DOM ? null : emptyHTML;
            }
          }

          /* Remove first element node (ours) if FORCE_BODY is set */
          if (body && FORCE_BODY) {
            _forceRemove(body.firstChild);
          }

          /* Get node iterator */
          var nodeIterator = _createIterator(IN_PLACE ? dirty : body);

          /* Now start iterating over the created document */
          while (currentNode = nodeIterator.nextNode()) {
            /* Fix IE's strange behavior with manipulated textNodes #89 */
            if (currentNode.nodeType === 3 && currentNode === oldNode) {
              continue;
            }

            /* Sanitize tags and elements */
            if (_sanitizeElements(currentNode)) {
              continue;
            }

            /* Shadow DOM detected, sanitize it */
            if (currentNode.content instanceof DocumentFragment) {
              _sanitizeShadowDOM(currentNode.content);
            }

            /* Check attributes, sanitize if necessary */
            _sanitizeAttributes(currentNode);

            oldNode = currentNode;
          }

          oldNode = null;

          /* If we sanitized `dirty` in-place, return it. */
          if (IN_PLACE) {
            return dirty;
          }

          /* Return sanitized string or DOM */
          if (RETURN_DOM) {
            if (RETURN_DOM_FRAGMENT) {
              returnNode = createDocumentFragment.call(body.ownerDocument);

              while (body.firstChild) {
                // eslint-disable-next-line unicorn/prefer-dom-node-append
                returnNode.appendChild(body.firstChild);
              }
            } else {
              returnNode = body;
            }

            if (ALLOWED_ATTR.shadowroot) {
              /*
                AdoptNode() is not used because internal state is not reset
                (e.g. the past names map of a HTMLFormElement), this is safe
                in theory but we would rather not risk another attack vector.
                The state that is cloned by importNode() is explicitly defined
                by the specs.
              */
              returnNode = importNode.call(originalDocument, returnNode, true);
            }

            return returnNode;
          }

          var serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;

          /* Sanitize final string template-safe */
          if (SAFE_FOR_TEMPLATES) {
            serializedHTML = stringReplace(serializedHTML, MUSTACHE_EXPR$$1, ' ');
            serializedHTML = stringReplace(serializedHTML, ERB_EXPR$$1, ' ');
          }

          return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
        };

        /**
         * Public method to set the configuration once
         * setConfig
         *
         * @param {Object} cfg configuration object
         */
        DOMPurify.setConfig = function (cfg) {
          _parseConfig(cfg);
          SET_CONFIG = true;
        };

        /**
         * Public method to remove the configuration
         * clearConfig
         *
         */
        DOMPurify.clearConfig = function () {
          CONFIG = null;
          SET_CONFIG = false;
        };

        /**
         * Public method to check if an attribute value is valid.
         * Uses last set config, if any. Otherwise, uses config defaults.
         * isValidAttribute
         *
         * @param  {string} tag Tag name of containing element.
         * @param  {string} attr Attribute name.
         * @param  {string} value Attribute value.
         * @return {Boolean} Returns true if `value` is valid. Otherwise, returns false.
         */
        DOMPurify.isValidAttribute = function (tag, attr, value) {
          /* Initialize shared config vars if necessary. */
          if (!CONFIG) {
            _parseConfig({});
          }

          var lcTag = transformCaseFunc(tag);
          var lcName = transformCaseFunc(attr);
          return _isValidAttribute(lcTag, lcName, value);
        };

        /**
         * AddHook
         * Public method to add DOMPurify hooks
         *
         * @param {String} entryPoint entry point for the hook to add
         * @param {Function} hookFunction function to execute
         */
        DOMPurify.addHook = function (entryPoint, hookFunction) {
          if (typeof hookFunction !== 'function') {
            return;
          }

          hooks[entryPoint] = hooks[entryPoint] || [];
          arrayPush(hooks[entryPoint], hookFunction);
        };

        /**
         * RemoveHook
         * Public method to remove a DOMPurify hook at a given entryPoint
         * (pops it from the stack of hooks if more are present)
         *
         * @param {String} entryPoint entry point for the hook to remove
         */
        DOMPurify.removeHook = function (entryPoint) {
          if (hooks[entryPoint]) {
            arrayPop(hooks[entryPoint]);
          }
        };

        /**
         * RemoveHooks
         * Public method to remove all DOMPurify hooks at a given entryPoint
         *
         * @param  {String} entryPoint entry point for the hooks to remove
         */
        DOMPurify.removeHooks = function (entryPoint) {
          if (hooks[entryPoint]) {
            hooks[entryPoint] = [];
          }
        };

        /**
         * RemoveAllHooks
         * Public method to remove all DOMPurify hooks
         *
         */
        DOMPurify.removeAllHooks = function () {
          hooks = {};
        };

        return DOMPurify;
      }

      var purify = createDOMPurify();

      return purify;

    }));

    });

    const converter = new showdown.Converter(
        {
            simplifiedAutoLink: true,
            strikethrough: true,
            tables: true,
            tasklists: true,
            openLinksInNewWindow: true,
            
        }
    );

    const markdown_to_html = markdown => purify.sanitize(converter.makeHtml(markdown));

    let draft_open = writable(false);

    /* src/components/routes/Draft.svelte generated by Svelte v3.46.2 */

    const { console: console_1 } = globals;
    const file$5 = "src/components/routes/Draft.svelte";

    function create_fragment$7(ctx) {
    	let div1;
    	let div0;
    	let button0;
    	let t1;
    	let form;
    	let span;
    	let t4;
    	let textarea;
    	let t5;
    	let button1;
    	let t6;
    	let button1_disabled_value;
    	let div1_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "X";
    			t1 = space();
    			form = element("form");
    			span = element("span");
    			span.textContent = `Post to ${channel}`;
    			t4 = space();
    			textarea = element("textarea");
    			t5 = space();
    			button1 = element("button");
    			t6 = text("Post");
    			attr_dev(button0, "class", "draft-close svelte-zxoohl");
    			add_location(button0, file$5, 35, 8, 1025);
    			attr_dev(span, "class", "draft-title svelte-zxoohl");
    			add_location(span, file$5, 37, 12, 1154);
    			attr_dev(textarea, "type", "text");
    			attr_dev(textarea, "placeholder", "Write something...");
    			attr_dev(textarea, "maxlength", "3000");
    			attr_dev(textarea, "class", "svelte-zxoohl");
    			add_location(textarea, file$5, 38, 12, 1217);
    			attr_dev(button1, "class", "draft-submit svelte-zxoohl");
    			attr_dev(button1, "type", "submit");
    			button1.disabled = button1_disabled_value = !/*text*/ ctx[0].trim();
    			add_location(button1, file$5, 44, 12, 1398);
    			attr_dev(form, "class", "svelte-zxoohl");
    			add_location(form, file$5, 36, 8, 1095);
    			attr_dev(div0, "class", "modal-window svelte-zxoohl");
    			add_location(div0, file$5, 34, 4, 990);

    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(/*$draft_open*/ ctx[1]
    			? "modal fade-in"
    			: "modal hidden") + " svelte-zxoohl"));

    			add_location(div1, file$5, 33, 0, 925);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t1);
    			append_dev(div0, form);
    			append_dev(form, span);
    			append_dev(form, t4);
    			append_dev(form, textarea);
    			set_input_value(textarea, /*text*/ ctx[0]);
    			append_dev(form, t5);
    			append_dev(form, button1);
    			append_dev(button1, t6);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*close_draft*/ ctx[3], false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[4]),
    					listen_dev(form, "submit", prevent_default(/*send_message*/ ctx[2]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) {
    				set_input_value(textarea, /*text*/ ctx[0]);
    			}

    			if (dirty & /*text*/ 1 && button1_disabled_value !== (button1_disabled_value = !/*text*/ ctx[0].trim())) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			if (dirty & /*$draft_open*/ 2 && div1_class_value !== (div1_class_value = "" + (null_to_empty(/*$draft_open*/ ctx[1]
    			? "modal fade-in"
    			: "modal hidden") + " svelte-zxoohl"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $draft_open;
    	validate_store(draft_open, 'draft_open');
    	component_subscribe($$self, draft_open, $$value => $$invalidate(1, $draft_open = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Draft', slots, []);
    	let text = "";

    	async function send_message() {
    		let next_text = text.trim();

    		if (next_text) {
    			$$invalidate(0, text = "");
    			next_text = markdown_to_html(next_text);
    			console.log(next_text);

    			if (next_text) {
    				const secret = await SEA.encrypt(next_text, "#dxexit");
    				const message = user.get("all").set({ what: secret });
    				const index = new Date().toISOString();
    				db.get("dxexithis@-" + channel).get(index).put(message);
    				window.location.reload();
    			}
    		}
    	}

    	function close_draft() {
    		draft_open.set(false);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Draft> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		text = this.value;
    		$$invalidate(0, text);
    	}

    	$$self.$capture_state = () => ({
    		channel,
    		markdown_to_html,
    		db,
    		user,
    		draft_open,
    		text,
    		send_message,
    		close_draft,
    		$draft_open
    	});

    	$$self.$inject_state = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text, $draft_open, send_message, close_draft, textarea_input_handler];
    }

    class Draft extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Draft",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/routes/Post.svelte generated by Svelte v3.46.2 */
    const file$4 = "src/components/routes/Post.svelte";

    function create_fragment$6(ctx) {
    	let section;
    	let div0;
    	let span;
    	let t0;
    	let t1_value = /*message*/ ctx[0].who + "";
    	let t1;
    	let t2;
    	let time;
    	let t4;
    	let div1;
    	let raw_value = markdown_to_html(/*message*/ ctx[0].what) + "";

    	const block = {
    		c: function create() {
    			section = element("section");
    			div0 = element("div");
    			span = element("span");
    			t0 = text("@");
    			t1 = text(t1_value);
    			t2 = space();
    			time = element("time");
    			time.textContent = `${/*ts*/ ctx[1].toLocaleTimeString()}`;
    			t4 = space();
    			div1 = element("div");
    			attr_dev(span, "class", "user svelte-1dqszdw");
    			add_location(span, file$4, 10, 4, 170);
    			attr_dev(time, "class", "svelte-1dqszdw");
    			add_location(time, file$4, 11, 4, 215);
    			attr_dev(div0, "class", "sender svelte-1dqszdw");
    			add_location(div0, file$4, 9, 2, 145);
    			attr_dev(div1, "class", "content markdown-body svelte-1dqszdw");
    			add_location(div1, file$4, 13, 2, 265);
    			attr_dev(section, "class", "svelte-1dqszdw");
    			add_location(section, file$4, 8, 0, 133);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(div0, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(div0, t2);
    			append_dev(div0, time);
    			append_dev(section, t4);
    			append_dev(section, div1);
    			div1.innerHTML = raw_value;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*message*/ 1 && t1_value !== (t1_value = /*message*/ ctx[0].who + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*message*/ 1 && raw_value !== (raw_value = markdown_to_html(/*message*/ ctx[0].what) + "")) div1.innerHTML = raw_value;		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Post', slots, []);
    	let { message } = $$props;
    	const ts = new Date(message.when);
    	const writable_props = ['message'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Post> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    	};

    	$$self.$capture_state = () => ({ markdown_to_html, message, ts });

    	$$self.$inject_state = $$props => {
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [message, ts];
    }

    class Post extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { message: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Post",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*message*/ ctx[0] === undefined && !('message' in props)) {
    			console.warn("<Post> was created without expected prop 'message'");
    		}
    	}

    	get message() {
    		throw new Error("<Post>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<Post>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/routes/Channel.svelte generated by Svelte v3.46.2 */
    const file$3 = "src/components/routes/Channel.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (54:8) {#each messages as message (message.when)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let chatmessage;
    	let current;

    	chatmessage = new Post({
    			props: { message: /*message*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(chatmessage.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(chatmessage, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const chatmessage_changes = {};
    			if (dirty & /*messages*/ 1) chatmessage_changes.message = /*message*/ ctx[3];
    			chatmessage.$set(chatmessage_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chatmessage.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chatmessage.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(chatmessage, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(54:8) {#each messages as message (message.when)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let main;
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let button;
    	let t2;
    	let draft;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*messages*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*message*/ ctx[3].when;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	draft = new Draft({
    			props: { active: /*$draft_open*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			button = element("button");
    			button.textContent = "+";
    			t2 = space();
    			create_component(draft.$$.fragment);
    			attr_dev(div, "class", "history svelte-1u4qdol");
    			add_location(div, file$3, 52, 4, 1809);
    			attr_dev(button, "class", "svelte-1u4qdol");
    			add_location(button, file$3, 57, 4, 1951);
    			attr_dev(main, "class", "svelte-1u4qdol");
    			add_location(main, file$3, 51, 0, 1798);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(main, t0);
    			append_dev(main, button);
    			insert_dev(target, t2, anchor);
    			mount_component(draft, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*show_draft*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*messages*/ 1) {
    				each_value = /*messages*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}

    			const draft_changes = {};
    			if (dirty & /*$draft_open*/ 2) draft_changes.active = /*$draft_open*/ ctx[1];
    			draft.$set(draft_changes);
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(draft.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(draft.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) detach_dev(t2);
    			destroy_component(draft, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $draft_open;
    	validate_store(draft_open, 'draft_open');
    	component_subscribe($$self, draft_open, $$value => $$invalidate(1, $draft_open = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Channel', slots, []);
    	let messages = [];

    	onMount(() => {
    		const match = {
    			// lexical queries are kind of like a limited RegEx or Glob.
    			".": {
    				// property selector
    				">": new Date(+new Date() - 1 * 1000 * 60 * 60 * 36).toISOString(), // find any indexed property within a time (36h)
    				
    			},
    			"-": 1, // filter in reverse
    			
    		};

    		// Get Messages
    		db.get("dxexithis@-" + channel).map(match).once(async (data, id) => {
    			if (data) {
    				// Key for end-to-end encryption (unset, can be read and set from user if needed)
    				const key = "#dxexit";

    				var message = {
    					// transform the data
    					who: await db.user(data).get("alias"), // a user might lie who they are! So let the user system detect whose data it is.
    					what: await SEA.decrypt(data.what, key) + "", // force decrypt as text.
    					when: GUN.state.is(data, "what"), // get the internal timestamp for the what property.
    					
    				};

    				if (message.what) {
    					$$invalidate(0, messages = [...messages.slice(-100), message].sort((a, b) => b.when - a.when));
    				}
    			}
    		});
    	});

    	function show_draft() {
    		draft_open.set(true);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Channel> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		channel,
    		Draft,
    		draft_open,
    		db,
    		ChatMessage: Post,
    		messages,
    		show_draft,
    		$draft_open
    	});

    	$$self.$inject_state = $$props => {
    		if ('messages' in $$props) $$invalidate(0, messages = $$props.messages);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [messages, $draft_open, show_draft];
    }

    class Channel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Channel",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/routes/Home.svelte generated by Svelte v3.46.2 */

    const file$2 = "src/components/routes/Home.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let form;
    	let label;
    	let t1;
    	let input;
    	let t2;
    	let button;

    	const block = {
    		c: function create() {
    			main = element("main");
    			form = element("form");
    			label = element("label");
    			label.textContent = "Go to a channel:";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Go";
    			attr_dev(label, "for", "c");
    			attr_dev(label, "class", "svelte-1h4mgqq");
    			add_location(label, file$2, 2, 8, 26);
    			attr_dev(input, "name", "c");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-1h4mgqq");
    			add_location(input, file$2, 3, 8, 74);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-1h4mgqq");
    			add_location(button, file$2, 4, 8, 113);
    			attr_dev(form, "class", "svelte-1h4mgqq");
    			add_location(form, file$2, 1, 4, 11);
    			attr_dev(main, "class", "svelte-1h4mgqq");
    			add_location(main, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, form);
    			append_dev(form, label);
    			append_dev(form, t1);
    			append_dev(form, input);
    			append_dev(form, t2);
    			append_dev(form, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/routes/Login.svelte generated by Svelte v3.46.2 */
    const file$1 = "src/components/routes/Login.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let form;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let label1;
    	let t4;
    	let input1;
    	let t5;
    	let button0;
    	let t7;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			form = element("form");
    			label0 = element("label");
    			label0.textContent = "Username";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label1 = element("label");
    			label1.textContent = "Password";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "Login";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Sign Up";
    			attr_dev(label0, "for", "username");
    			attr_dev(label0, "class", "svelte-1r5jjjr");
    			add_location(label0, file$1, 23, 4, 391);
    			attr_dev(input0, "name", "username");
    			attr_dev(input0, "minlength", "3");
    			attr_dev(input0, "maxlength", "16");
    			attr_dev(input0, "class", "svelte-1r5jjjr");
    			add_location(input0, file$1, 24, 4, 434);
    			attr_dev(label1, "for", "password");
    			attr_dev(label1, "class", "svelte-1r5jjjr");
    			add_location(label1, file$1, 26, 4, 516);
    			attr_dev(input1, "name", "password");
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "class", "svelte-1r5jjjr");
    			add_location(input1, file$1, 27, 4, 559);
    			attr_dev(button0, "class", "login svelte-1r5jjjr");
    			add_location(button0, file$1, 29, 4, 628);
    			attr_dev(button1, "class", "login svelte-1r5jjjr");
    			add_location(button1, file$1, 30, 4, 686);
    			attr_dev(form, "class", "svelte-1r5jjjr");
    			add_location(form, file$1, 22, 2, 355);
    			attr_dev(main, "class", "svelte-1r5jjjr");
    			add_location(main, file$1, 21, 0, 346);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, form);
    			append_dev(form, label0);
    			append_dev(form, t1);
    			append_dev(form, input0);
    			set_input_value(input0, /*username*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, label1);
    			append_dev(form, t4);
    			append_dev(form, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t5);
    			append_dev(form, button0);
    			append_dev(form, t7);
    			append_dev(form, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(button0, "click", /*login*/ ctx[2], false, false, false),
    					listen_dev(button1, "click", /*signup*/ ctx[3], false, false, false),
    					listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[4]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*username*/ 1 && input0.value !== /*username*/ ctx[0]) {
    				set_input_value(input0, /*username*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	let username;
    	let password;

    	function login() {
    		user.auth(username, password, ({ err }) => err && alert(err));
    	}

    	function signup() {
    		user.create(username, password, ({ err }) => {
    			if (err) {
    				alert(err);
    			} else {
    				login();
    			}
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function submit_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({ user, username, password, login, signup });

    	$$self.$inject_state = $$props => {
    		if ('username' in $$props) $$invalidate(0, username = $$props.username);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		username,
    		password,
    		login,
    		signup,
    		submit_handler,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Main.svelte generated by Svelte v3.46.2 */

    // (15:0) {:else}
    function create_else_block_1(ctx) {
    	let login;
    	let current;
    	login = new Login({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(login.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(login, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(login, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(15:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (9:0) {#if $username}
    function create_if_block$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (channel) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1();
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(9:0) {#if $username}",
    		ctx
    	});

    	return block;
    }

    // (12:2) {:else}
    function create_else_block(ctx) {
    	let home;
    	let current;
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(12:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (10:2) {#if channel}
    function create_if_block_1$1(ctx) {
    	let channel_1;
    	let current;
    	channel_1 = new Channel({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(channel_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(channel_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(channel_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(channel_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(channel_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(10:2) {#if channel}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$username*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $username;
    	validate_store(username, 'username');
    	component_subscribe($$self, username, $$value => $$invalidate(0, $username = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Main', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		channel,
    		username,
    		Channel,
    		Home,
    		Login,
    		$username
    	});

    	return [$username];
    }

    class Main extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Header.svelte generated by Svelte v3.46.2 */
    const file = "src/components/Header.svelte";

    // (14:2) {#if get_and_load_channel()}
    function create_if_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = `/${channel}`;
    			add_location(span, file, 14, 4, 274);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(14:2) {#if get_and_load_channel()}",
    		ctx
    	});

    	return block;
    }

    // (18:2) {#if $username}
    function create_if_block(ctx) {
    	let div;
    	let strong;
    	let t0;
    	let t1;
    	let t2;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			t0 = text("@");
    			t1 = text(/*$username*/ ctx[0]);
    			t2 = space();
    			button = element("button");
    			button.textContent = "Sign Out";
    			add_location(strong, file, 19, 6, 358);
    			attr_dev(div, "class", "user-bio svelte-1hql5t8");
    			add_location(div, file, 18, 4, 329);
    			attr_dev(button, "class", "signout-button svelte-1hql5t8");
    			add_location(button, file, 22, 4, 404);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(strong, t0);
    			append_dev(strong, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*signout*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$username*/ 1) set_data_dev(t1, /*$username*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(18:2) {#if $username}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let header;
    	let a;
    	let h1;
    	let t1;
    	let show_if = get_and_load_channel();
    	let t2;
    	let if_block0 = show_if && create_if_block_1(ctx);
    	let if_block1 = /*$username*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			header = element("header");
    			a = element("a");
    			h1 = element("h1");
    			h1.textContent = "DXEXIT";
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(h1, "class", "svelte-1hql5t8");
    			add_location(h1, file, 11, 15, 218);
    			attr_dev(a, "href", "./");
    			attr_dev(a, "class", "svelte-1hql5t8");
    			add_location(a, file, 11, 2, 205);
    			attr_dev(header, "class", "svelte-1hql5t8");
    			add_location(header, file, 10, 0, 194);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, a);
    			append_dev(a, h1);
    			append_dev(header, t1);
    			if (if_block0) if_block0.m(header, null);
    			append_dev(header, t2);
    			if (if_block1) if_block1.m(header, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (show_if) if_block0.p(ctx, dirty);

    			if (/*$username*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(header, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $username;
    	validate_store(username, 'username');
    	component_subscribe($$self, username, $$value => $$invalidate(0, $username = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);

    	function signout() {
    		user.leave();
    		username.set("");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		username,
    		user,
    		channel,
    		get_and_load_channel,
    		signout,
    		$username
    	});

    	return [$username, signout];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.2 */

    function create_fragment(ctx) {
    	let header;
    	let t;
    	let main;
    	let current;
    	header = new Header({ $$inline: true });
    	main = new Main({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t = space();
    			create_component(main.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(main, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(main.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(main.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(main, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	onMount(() => {
    		get_and_load_channel();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Main,
    		Header,
    		get_and_load_channel,
    		onMount
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
