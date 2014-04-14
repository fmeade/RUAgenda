/*
 * TODO: migrate databse functionality to 'com.phonegap.plugins.sqlite'
 * > https://github.com/brodysoft/Cordova-SQLitePlugin
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    
    // Bind Event Listeners
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        $( "#new-class-cancel" ).on("click", this.addNewClassCancelHandler);
        $( "#new-class-save" ).on("click", this.addNewClassSaveHandler);
        $( "#classList li a#add-new-class-btn" ).on("click", this.addNewClassHandler);
    },
    
    // initialze the local storage database
    initializeLDB: function() {
        html5sql.openDatabase("edu.radford.agenda.db", "RU-Agena-DB", 1024*1024*5);
        html5sql.process(
            [
                "drop table Classes;","drop table Assignments",
                "create table if not exists Classes ( cname TEXT PRIMARY KEY NOT NULL, ctitle TEXT DEFAULT '' NOT NULL, instructor TEXT, location TEXT, times TEXT );",
                "insert or ignore into Classes ( cname ) values ( 'none' );",
                "create table if not exists Assignments ( id INTEGER PRIMARY KEY AUTOINCREMENT, course TEXT NOT NULL REFERENCES Classes(cname) DEFAULT 'none', name TEXT NOT NULL DEFAULT 'Assignment', description TEXT DEFAULT '', dueDate INTEGER, notify INTEGER NOT NULL DEFAULT 0 CHECK(notify == 0 or notify == 1), whenNotify  INTEGER );"
            ],
            function() {
                console.log("Initialized local database tables");
            },
            app.logSqlError
        );
    },
    
    /***************************************************************************
     * Event handlers
     **************************************************************************/

    /* deviceready Event Handler
     * >> the phonegap api is not ready until this method is called!
     * The scope of 'this' is the event. In order to call the 'receivedEvent'
     * function, we must explicity call 'app.receivedEvent(...);'
     */
    onDeviceReady: function() {
        app.initializeLDB();
        app.makeSampleClasses();
    },
    
    addNewClassHandler: function() {
        $("#new-class").popup("open");
    },
    addNewClassCancelHandler: function() {
        $("#new-class").popup("close");
        $("#new-class :text").val("");
    },
    addNewClassSaveHandler: function() {
        var section = new ClassSection( 
            $("#new-class-id").val(),
            $("#new-class-title").val(),
            $("#new-class-who").val(),
            $("#new-class-where").val(),
            $("#new-class-when").val()
        );
        ClassList.addClass(section);
        $("#new-class").popup("close");
        $("#new-class :text").val("");
    },

    editExistingClassHandler: function() {
        $("#edit-class").popup("open");
    },
     
    /***************************************************************************
     * Dev/Debug stuff
     **************************************************************************/
    
    logSqlError: function(error, statement) {
        console.log(error);
        console.log(statement);
    },
    
    /* DELETE ME LATER!
     * Creates some sample class rows to query against.
     */
    makeSampleClasses: function() {
        var someClasses = [
            new ClassSection("ITEC 110", "Principles of Information Technology", "Dr. Htay", "MG 203", "TR 3:30 - 4:45 PM"),
            new ClassSection("ITEC 120", "Principles of Computer Science I", "Dr. Braffitt", "DA 225", "MWRF 11 - 11:50 AM"),
            new ClassSection("MATH 151", "Calculus I", "Cabbage", "RU 314", "MWF 1 - 1:50 PM"),
            new ClassSection("ART 111", "Art Appreciation", "Pop", "Porterfield", "MWF 9 - 9:50 AM")
        ];
        for (var i = 0; i < someClasses.length; ++i) {
            ClassList.addClass( someClasses[i] );
        }
    },
};

/* ClassSection object to hold the attributes of a class... */
var ClassSection = function(_name, _title, _instructor, _location, _times) {
    this.name = _name;
    this.title = _title;
    this.instructor = _instructor;
    this.location = _location;
    this.times = _times;
};
ClassSection.prototype.name = '';
ClassSection.prototype.title = '';
ClassSection.prototype.instructor = '';
ClassSection.prototype.location = '';
ClassSection.prototype.times = '';

/* abstraction of list of classes - contains functions to add/edit/remove
 * list items.  Each function attempts to mutate the local database
 * and will mutate the DOM if the db dml statement is successful
 */
var ClassList = {
    // add a class specced by a classSection object
    addClass: function(cls) {
        // success callback: update the dom if db insert succeeds
        var addClassToDom = function() {
            var $newItem = $( ClassList.generateClassListItem(cls) );
            // for whatever reason, it does not behave w/ insertBefore
            //$newItem.insertBefore( $("#classList").filter(":last") );
            $("#classList").append($newItem);
            $("#classList").listview("refresh");
            $("#classList").on("click", "li a.class-list-item", app.editExistingClassHandler);
        }
        // insert in db
        html5sql.process(
            [{
                "sql": "Insert or Replace into Classes Values (?, ?, ?, ?, ?)",
                "data": [ cls.name, cls.title, cls.instructor, cls.location, cls.times ],
                "success": function(transaction, results) {}
            }],
            addClassToDom,
            app.logSqlError
        );
    },
    // edit: finds the class by id and replaces it with attributes from 
    // provided classsection object in both db and DOM
    editClass: function(clsName, newCls) {
        
    },
    // remove a class - deletes from table (don't forget all associated assignments)
    // and on success removes corresponding list item from the dom
    removeClass: function(clsName) {
        
    },
    
    generateClassListItem: function(cls) {
        return "<li id='" + cls.name + "'><a class='class-list-item' href='#'>\
                " + cls.name + "<p><strong>" + cls.title + "</strong></p> \
                <p>" + cls.instructor + "</p><p>" + cls.location + "</p> \
                <p>" + cls.times +"</p></a></li>";
    },
};
