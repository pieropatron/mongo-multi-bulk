# mongo-multi-bulk
helper to collect mongodb bulkWrite operations for several collections for further execution

According to my expirience, it is often required of processing a lot of bulkWrite operations of mongodb. And, frequently, for application logic these operations should be executed for several collections at once in parallel. For example, when need to update some collection and in the same time save information about this update to collection responsible for history of changes and etc. Thus, goals of this project is to provide helpers for collect bulk write operations for every required collection with abulity of further execution, of course.

NB: project written for mongodb driver version 4, tested for version mongodb@4.14.0

# Install
`npm install @pieropatron/mongo-multi-bulk`

or

`npm install https://github.com/pieropatron/mongo-multi-bulk.git`

# Import
``` ts
import {getItem, fromItemsObject, fromCollectionsObject} from '@pieropatron/mongo-multi-bulk';
```

# getItem
This method serves to get item for store bulkwrite operations for single collection. In two words it is a combination of collection and array of bulkWrite operations for this collection. This method suppose following arguments:

* `collection: Collection<TSchema extends Document>` Collection for which commands stores and executes. Mandatory.
* `colname: string` Alias of collection. Optional. Default is collection.collectionName

Returns instance of `BulkWriteItem<TSchema extends Document>`

## Usage:
``` ts
import * as MMB from '@pieropatron/mongo-multi-bulk';
const collection = db.collection<{name: string, age: number}>("test_collection");
const bwi = MMB.getItem(collection, "test");

bwi.push({insertOne: {document: {name: "Holly War", age: 30}}});
bwi.insertOne({name: "John Dow", age: 45});
bwi.insertMany([
	{name: "John Smith", age: 25},
	{name: "Jane Smith", age: 20},
	{name: "Test", age: 0}
]);
bwi.updateOne({name: "John Dow"}, {$set: {age: 40}});
bwi.updateMany({name: / Smith$/}, {$set: {age: 18}});
bwi.deleteOne({name: "Test"});
bwi.deleteMany({age: {$gt: 30}});
if (bwi.size){
	await bwi.execute({ordered: false});
}
```

## BulkWriteItem

We have following methods and properties for BulkWriteItem:

* `collection: Collection<TSchema>`. collection from options
* `colname: string`. colname from options
* `size: number`. Property to get current amount of operations
* `push(...op: AnyBulkWriteOperation[]): number`. Serves to push new bulkWrite operations. Return amount of operations after push
* InsertOne, InsertMany, replaceOne, updateOne, updateMany, deleteOne, deleteMany: These are helpers for push corresponded operations. Their arguments are very similar with operations options. All of these methods returns `this`, which is instance of BulkWriteItem;
* `concat(...items: BulkWriteItem<TSchema>[])`. Concat with another BulkWriteItem(s). Note: this method mutates current BulkWriteItem.
* `execute(options?: BulkWriteOptions): Result`. Execute all stored bulkWrite operations and flush operations array. Result there has following structure:

* `colname: string`. Collection name (BulkWriteItem.colname)
* `count: number`. Amount of operations being executed
* `bulk?: BulkWriteResult`. result of bulkWrite. Optional, undefined if there were no operations to execute

As you can see, BulkWriteItem is very similar with mongodb.OrderedBulkOperation | UnorderedBulkOperation which are results of collection.initializeOrderedBulkOp() | collection.initializeUnorderedBulkOp() methods. But, as I understand, these methods are legacy and requires MongoClient to be connected. And it is recommended to use collection.bulkWrite instead of them. So, BulkWriteItem just follows these recommendations.

# fromItemsObject

This method wraps object of properties BulkWriteItem to allow at once execution of all bulkWrite operations for all BulkWriteItems inside it.

## Usage

``` ts
import * as MMB from '@pieropatron/mongo-multi-bulk';

const multi = MMB.fromItemsObject({
	users: MMB.getItem(db.collection<{ name: string, age: number }>("users")),
	history: MMB.getItem(db.collection<{ _iduser: ObjectId, key: "name" | "age", value: string | number, start: Date, end?: Date }>("users_history"), "history")
});

const user = {
	_id: new ObjectId(),
	name: "Harley D",
	age: 42
};
const start = new Date();
multi.users.insertOne(user);

multi.history.insertMany([
	{_iduser: user._id, key: "age", value: user.age, start},
	{_iduser: user._id, key: "name", value: user.name, start}
]);

await multi.execute();
```
Result of this operation have BulkWriteMulti structure, described below.

## BulkWriteMulti properties and methods

* `[key: string]: BulkWriteItem`. Keys and values of wrapped object
* `size: number`. Get size of all BulkWriteItem(s) inside
* `keys: string[]`. Keys of wrapped object
* `execute(options?: BulkWriteOptions): Result[]`. Executes all BulkWriteItem(s) inside. Returns array of Result structure, described above.

# fromCollectionsObject

This method doing the same as fromItemsObject, but have object of properties Collection as argument. It was created, because in many cases it is more comfortable to work with collections.

## Usage is very similar:

``` ts
import * as MMB from '@pieropatron/mongo-multi-bulk';

const multi = MMB.fromCollectionsObject({
	users: db.collection<{ name: string, age: number }>("users"),
	history: db.collection<{ _iduser: ObjectId, key: "name" | "age", value: string | number, start: Date, end?: Date }>("users_history")
});

const user = {
	_id: new ObjectId(),
	name: "Harley D",
	age: 42
};
const start = new Date();
multi.users.insertOne(user);

multi.history.insertMany([
	{_iduser: user._id, key: "age", value: user.age, start},
	{_iduser: user._id, key: "name", value: user.name, start}
]);

await multi.execute();
```

As you can see, this is very simple utils, but they makes my work a bit more comfortable. Hope, this will be useful for you too.
