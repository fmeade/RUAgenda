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
        ldb.initialize();
        app.initiateClassListUpdate();
    },
    
    initiateClassListUpdate: function() {
        ldb.getClassList();
    },
    
    completeClassListUpdate: function(classList) {
        $listDom = $( "#classList" );
        $listDom.empty();
        $.each(classList, function(i, cls) {
            $listDom.append( app.generateClassListItem( cls ) );
        });
        $listDom.listview('refresh');
    },
    
    generateClassListItem: function(cls) {
        return "<li><a href='#'>" + cls.name + "<p><strong>" + cls.title + "</strong></p> \
                <p>" + cls.instructor + "</p><p>" + cls.location + "</p> \
                <p>" + cls.times +"</p></a></li>";
    },
};

/* ClassSection object to hold the attributes of a class... */
var ClassSection = function(_name, _title, _instructor, _location, _times) {
    this.name = _name;
    this.title = _title;
    this.instructor = _instructor;
    this.location = _location;
    this.times = _times;
}
ClassSection.prototype.name = '';
ClassSection.prototype.title = '';
ClassSection.prototype.instructor = '';
ClassSection.prototype.location = '';
ClassSection.prototype.times = '';

/* object literal to encapsulate local database operations */
var ldb = {
    
    /** Initializes the database tables */
    initialize: function() {
        html5sql.openDatabase("edu.radford.agenda.db", "RU-Agena-DB", 1024*1024*1024);
        html5sql.process(
            [
                "create table if not exists Classes ( cname TEXT PRIMARY KEY NOT NULL, ctitle TEXT DEFAULT '' NOT NULL, instructor TEXT, location TEXT, times TEXT );",
                "insert or ignore into Classes ( cname ) values ( 'none' );",
                "create table if not exists Assignments ( id INTEGER PRIMARY KEY AUTOINCREMENT, course TEXT NOT NULL REFERENCES Classes(cname) DEFAULT 'none', name TEXT NOT NULL DEFAULT 'Assignment', description TEXT DEFAULT '', dueDate INTEGER, notify INTEGER NOT NULL DEFAULT 0 CHECK(notify == 0 or notify == 1), whenNotify  INTEGER );"
            ],
            function() {
                console.log("Initialized local database tables");
            },
            function(error, statement) {
                console.log(error);
                console.log(statement);
            }
        );
        this.makeSampleClasses();
    },
    
    /** Queries the database for a list of all classes (i.e., class sections),
     * and on success creates a list of ClassSection objects and passes the list 
     * to 'completeClassListUpdate', which generates page elements from the objects
     */
    getClassList: function() {
        var classList = [];
        var callback = function(transaction, result) {
            var classList = []
            if (result != null && result.rows != null) {
                for (var i = 0; i < result.rows.length; ++i) {
                    var row = result.rows.item(i);
                    var cls = new ClassSection(row.cname, 
                        row.ctitle, row.instructor,
                        row.location, row.times);
                    classList.push(cls);
                }
            }
            app.completeClassListUpdate(classList);
        };
        html5sql.process(
            [{
                "sql": "Select * from Classes Where cname != 'none';",
                "data": [],
                "success": callback
            }],
            function() {
                console.log("Fetched classes");
            },
            function(error, statement) {
                console.log(error);
                console.log(statement);
            }
        );
    },
    
    /** DELETE ME LATER!
     * Creates some sample class rows to query against.
     */
    makeSampleClasses: function() {
        var singleSuccess = function(transaction, results) {};
        html5sql.process(
            [
                {
                    "sql": "Insert or replace into Classes Values (?, ?, ?, ?, ?);",
                    "data": ["ITEC 315", "GUI class", "Dr. Phillips", "Da 200", "time"],
                    "success": singleSuccess()
                },
                {
                    "sql": "Insert or replace into Classes Values (?, ?, ?, ?, ?);",
                    "data": ["ITEC 441", "Database class", "Dr. Phillips", "Da 201", "some other time"],
                    "success": singleSuccess()
                },
                {
                    "sql": "Insert or replace into Classes Values (?, ?, ?, ?, ?);",
                    "data": ["MATH 352", "Is this a real class?", "Someone", "Somewhere", "Sometime"],
                    "success": singleSuccess()
                },
                {
                    "sql": "Insert or replace into Classes Values (?, ?, ?, ?, ?);",
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
