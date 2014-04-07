/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
        ldb.initialize();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    },
};

var ldb = {
    
    initialize: function() {
        html5sql.openDatabase("edu.radford.agenda.db", "RU-Agena-DB", 1024*1024*1024);
        html5sql.process(
            [
                "create table if not exists Classes ( cname TEXT PRIMARY KEY NOT NULL, ctitle TEXT DEFAULT '' NOT NULL, instructor TEXT, location TEXT, times TEXT );",
                "insert or ignore into Classes ( cname ) values ( 'none' );",
                "create table if not exists Assignments ( id INTEGER PRIMARY KEY AUTOINCREMENT, course TEXT NOT NULL REFERENCES Classes(cname) DEFAULT 'none', name TEXT NOT NULL DEFAULT 'Assignment', description TEXT DEFAULT '', dueDate INTEGER, notify INTEGER NOT NULL DEFAULT 0 CHECK(notify == 0 or notify == 1), whenNotify  INTEGER );"
            ],
            function() {
                console.log("Initialized local databse tables");
            },
            function(error, statement) {
                console.log(error);
                console.log(statement);
            }
        );
        this.makeSampleClasses();
    },
    
    makeSampleClasses: function() {
        var singleSuccess = function(transaction, results) {
            console.log(transaction);
            console.log(results);
        }
        html5sql.process(
            [
                {
                    "sql": "Insert into Classes Values (?, ?, ?, ?, ?);",
                    "data": ["ITEC 315", "GUI class", "Dr. Phillips", "Da 200", "time"],
                    "success": singleSuccess()
                },
                {
                    "sql": "Insert into Classes Values (?, ?, ?, ?, ?);",
                    "data": ["ITEC 441", "Database class", "Dr. Phillips", "Da 201", "some other time"],
                    "success": singleSuccess()
                },
                {
                    "sql": "Insert into Classes Values (?, ?, ?, ?, ?);",
                    "data": ["MATH 352", "Is this a real class?", "Someone", "Somewhere", "Sometime"],
                    "success": singleSuccess()
                },
                {
                    "sql": "Insert into Classes Values (?, ?, ?, ?, ?);",
                    "data": ["ITEC 324", "Principles of Computer Science III", "Hwajung Lee", "Da class", "MWH 10:00-10:50"],
                    "success": singleSuccess()
                }                
            ],
            function() {
                console.log("Inserted sample data");
            },
            function(error, statement) {
                console.log(error);
                console.log(statement);
            }
        );
    }
    
}
