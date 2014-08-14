var OTG = (function() {
	if(typeof(OTG) !== 'undefined') throw new Error('OscarTheGrouch.js is already loaded.');
	
	var nextObjectId = 1;
	var activeObjectMap = Object.create(null);
	
	var getObjectId = function getObjectId(object) {
		if(Object.prototype.hasOwnProperty.call(object, '__objectId')) {
			return object['__objectId'];
		}else{
			var id = ++nextObjectId;
		
			try {
				Object.defineProperty(object, '__objectId', {
					enumerable: false,
					configurable: false,
					writable: false,
					value: id 
				});	
			}catch(e){
				return null;
			}
		
			activeObjectMap[id] = object;
		
			return id;	
		}
	};
	
	var crawlActiveObjects = function crawlActiveObjects(object) {
		var objectId;
		
		if(object === activeObjectMap) return;
		
		try {
			objectId = getObjectId(object);
		
			if(objectId === null) {
				return;
			}else{
				if(objectId in activeObjectMap) {
					return;
				}else{
					activeObjectMap[objectId] = object;
				}
			}
		}catch(e){
			return;
		}
				
		var prototype = Object.getPrototypeOf(object);
		if(prototype !== null && typeof(prototype) === 'object' || typeof(prototype) === 'function') {
			crawlActiveObjects(prototype);
		}
		
		var propertyNames = Object.getOwnPropertyNames(object);
		var propertyNamesLength = propertyNames.length;
		var i;
		var propertyName;
		var propertyDescriptor;
		var value;
		
		for(i = 0; i < propertyNamesLength; i++) {
			propertyName = propertyNames[i];
			value = null;
			
			try {
				propertyDescriptor = Object.getOwnPropertyDescriptor(object, propertyName);
				value = propertyDescriptor.value;
			}catch(e){
			}
			
			if(value !== null && typeof(value) === 'object' || typeof(value) === 'function') {
				crawlActiveObjects(value);
			}
		}
		
		if(typeof(object) === 'function' && typeof(object.getClosure) === 'function') {
			var closure = object.getClosure();
			var variableName;
			var value;
				
			for(variableName in closure) {
				value = closure[variableName];
					
				if(value !== null && typeof(value) === 'object' || typeof(value) === 'function') {
					crawlActiveObjects(value);
				}
			}
		}
	};
	
	var start;
	var end;
	var wait = 0;
	var threashold = 0;
	var lazy = 100; // work ~1/lazy of the time
	var observers = [];
	
	
	var processObservers = function() {
		for(var i = 0; i < observers.length; i++) {
			try {
				if(typeof(activeObjectMap[observers[i].objectId]) === 'undefined') {
					setTimeout(observers[i].callback, 0);
					observers.splice(i, 1);
				}
			}catch(e){}
		}
	};
	
	setInterval(function() {
		if(wait++ >= threashold) {
			wait = 0;
			threashold = null;
			
			start = +new Date();
			activeObjectMap = Object.create(null);
			crawlActiveObjects(this);
			processObservers();
			end = +new Date();
			
			threashold = end - start;
		}
	}, lazy);
	
	var _addEventListener = EventTarget.prototype.addEventListener;
	var _removeEventListener = EventTarget.prototype.removeEventListener;
	
	EventTarget.prototype.eventListenerList = {};
	
	EventTarget.prototype.addEventListener = function addEventListener(eventName, callback) {
		if(!this.hasOwnProperty('eventListenerList')) this.eventListenerList = {};
		var returnValue = _addEventListener.apply(this, arguments);
		if(!this.eventListenerList[eventName]) this.eventListenerList[eventName] = [];
		if(this.eventListenerList[eventName].indexOf(callback) === -1) this.eventListenerList[eventName].push(callback);
		return returnValue;
	};
	
	EventTarget.prototype.removeEventListener = function removeEventListener(eventName, callback) {
		if(!this.hasOwnProperty('eventListenerList')) this.eventListenerList = {};
		var returnValue = _removeEventListener.apply(this, arguments);
		if(!this.eventListenerList[eventName]) this.eventListenerList[eventName] = [];
		var offset = this.eventListenerList[eventName].indexOf(callback);
		if(offset !== -1) this.eventListenerList[eventName].splice(offset, 1);
		return returnValue;
	};
	
	Function.prototype.bind = function bind(thisValue) {
		var boundFunction = function boundFunction() {
			return boundFunction.originalFunction.apply(boundFunction.thisValue, arguments);
		};
		
		boundFunction.originalFunction = this;
		boundFunction.thisValue = thisValue;
		
		return boundFunction;
	};
	
	var _setTimeout = setTimeout;
	
	setTimeout = function setTimeout(callback, timeout) {
		var timerId;
		
		if(typeof callback === 'function') {
			timerId = _setTimeout(function() {
				try {
					callback();
				}finally{
					delete setTimeout.__objectIdHandles[timerId];
				}
			}, timeout);
			
			setTimeout.__objectIdHandles[timerId] = callback;
		}else{
			timerId = _setTimeout.apply(this, arguments);
		}
		
		return timerId;
	};
	
	setTimeout.__objectIdHandles = {};
	
	var _clearTimeout = clearTimeout;
	
	clearTimeout = function clearTimeout(timerId) {
		if(timerId) delete setTimeout.__objectIdHandles[timerId];
		
		return _clearTimeout.apply(this, arguments);
	};
	
	var _setInterval = setInterval;
	
	setInterval = function setInterval(callback, timeout) {
		var intervalId = _setInterval.apply(this, arguments);
		
		if(typeof callback === 'function') {
			setInterval.__objectIdHandles[intervalId] = callback;
		}
		
		return intervalId;
	};
	
	setInterval.__objectIdHandles = {};
	
	var _clearInterval = clearInterval;
	
	clearInterval = function clearInterval(intervalId) {
		if(intervalId) delete setInterval.__objectIdHandles[intervalId];
		
		return _clearInterval.apply(this, arguments);
	};
	
	var internalGetObjectId = getObjectId;
	
	return {
		getObjectById: function getObjectById(objectId) {
			return activeObjectMap[objectId] || null;
		},
		getObjectId: function getObjectId(object) {
			if(!object || (typeof(object) !== 'object' && typeof(object) !== 'function')) throw new Error('Cannot get objectId of primative value.');
		
			return internalGetObjectId(object);
		},
		notifyOnCollected: function(objectId, callback) {
			if(!activeObjectMap[objectId]) throw new Error('Invalid or collected object id');
			if(typeof(callback) !== 'function') throw new Error('Callback must be a function');
			
			observers.push({
				objectId: objectId,
				callback: callback
			});
		},
		
		countActiveObjects: function countActiveObjects() {
			return Object.keys(activeObjectMap).length;
		},
		setLazy: function(lazyValue) {
			if(typeof(lazyValue) === 'number' && ~~lazyValue === lazyValue) {
				return lazy = lazyValue;
			}else{
				throw new Error('The lazy must be an integer.');	
			}
		}
	};
})();