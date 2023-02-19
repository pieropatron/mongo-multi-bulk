"use strict";

import {MongoClient, ObjectId} from 'mongodb';
import {strictEqual} from 'assert';
import * as mbwlib from '../src/index';

const url = "mongodb://localhost:27017"

const run = async()=>{
	const client = new MongoClient(url, {});
	await client.connect();
	const db = client.db("test");

	const mbw = mbwlib.fromCollectionsObject({
		mbw0: db.collection("test_mbw0"),
		mbw1: db.collection("test_mbw1"),
		mbw2: db.collection("test_mbw2")
	});

	await Promise.all(
		mbw.keys.map(alias=>{
			return (mbw[alias].collection).deleteMany({});
		})
	);

	const COUNT = 1000;
	for (let i=0; i<COUNT; i++){
		const _id = new ObjectId();
		mbw.keys.forEach(key=>{
			mbw[key].push({
				updateOne: {
					filter: { _id },
					update: { $set: { [key]: i } },
					upsert: true
				}
			});
		});
	}

	await mbw.execute();

	await Promise.all(mbw.keys.map(key=>{
		return (async ()=>{
			const collection = mbw[key].collection;
			if (!collection){
				strictEqual(false, true, "Collection not found");
			}
			const count = await collection.countDocuments();
			strictEqual(count, COUNT);
			const first = await collection.findOne({}, {sort: {[key]: 1}});
			strictEqual(first?.[key], 0, "First row mismatch");
			const last = await collection.findOne({}, { sort: { [key]: -1 } });
			strictEqual(last?.[key], COUNT - 1, "Last row mismatch");
			await db.dropCollection(collection.collectionName);
		})();
	}));
	mbw.mbw0.insertMany([{ x: 1 }, {x: 2}, {x: 3}]);
	await mbw.execute();
	strictEqual(await mbw.mbw0.collection.countDocuments(), 3);

	mbw.mbw0.updateOne({x: 1}, {$set: {a: 1}});
	mbw.mbw0.updateMany({x: {$gt:1}}, {$set: {a: 2}});
	await mbw.execute();
	strictEqual(await mbw.mbw0.collection.countDocuments({a:1}), 1);
	strictEqual(await mbw.mbw0.collection.countDocuments({a:2}), 2);

	mbw.mbw0.deleteOne({x:1});
	mbw.mbw0.deleteMany({x: {$gt: 1}});
	await mbw.execute();
	strictEqual(await mbw.mbw0.collection.countDocuments(), 0);

	// console.log(mbw.toJSON());
	// console.log(mbw);
}

run().then(()=>{
	console.log("OK");
	process.exit(0);
}, error=>{
	console.error(error);
	process.exit(1);
});
