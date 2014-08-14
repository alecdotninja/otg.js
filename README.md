# OscarTheGrouch.js

OscarTheGrouch.js is a lightweight garbage collector and object manager designed to be used with Meta.js.

## Usage
Every object is assigned a unique object id that can be used to obtain a referance to it later (provided it has not been collected).

```js
var anObject = {
    foo: 'bar'
};
anObject.aCircularReference = anObject;

var anObjectId = OTC.getObjectId(anObject);

OTC.getObjectById(anObjectId) === anObject; // true

anObject = 7; // anObject is no longer referenceable

setTimeout(function() {
   OTC.getObjectById(anObjectId) === null; // true
}, 5000);
```

OTG can also notify you when an object has been collected.
```js
var anObject = {
    foo: 'bar'
};
var anObjectId = OTC.getObjectId(anObject);

OTG.notifyOnCollection(anObjectId, function() {
    console.log('anObject has been collected!');
});

anObject = null; // anObject is no longer referenceable
```