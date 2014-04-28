/*  index.js
 *  Bowtie Code - Spring 2014
 *
 *  JavaScript code for the RU Agenda Phonegap application
 *
 * TODO: migrate database functionality to 'com.phonegap.plugins.sqlite'
 * @see https://github.com/brodysoft/Cordova-SQLitePlugin
 */
(function () {
    /* yes please */
    'use strict';
    var courseList, // object holds list of courses and manages 'Classes' table in db
        taskList,   // " " " " assignments and manages 'Assignments' table in db
        notifyCodes = { // static codes used to generate notification dates
        "7d": {display: "1 week", ms: 604800000},
        "3d": {display: "3 days", ms: 259200000},
        "1d": {display: "1 day", ms: 86400000},
        "12h": {display: "12 hours", ms: 43200000},
        "6h": {display: "6 hours", ms: 21600000},
        "3h": {display: "3 hours", ms: 10800000},
        "1h": {display: "1 hour", ms: 3600000},
        "30m": {display: "30 minutes", ms: 1800000},
        "none": {display: "(no notify)", ms: undefined}
    };
    /**
     * Constructor for a single assignment (a.k.a. task) object
     * Invoked w/out the 'new' keyword: `var taskObj = makeAssignment(...);`
     * @param  {string} _title
     * @param  {string} _course
     * @param  {string} _desc
     * @param  {Date} _due
     * @param  {String} _notify
     * @return {Task Object}
     */
    function makeAssignment (_name, _desc, _course, _due, _notify) {
        // create a new object from the Object prototype
        var that = Object.create(null);
        // add our custom attributes
        that.name = _name;
        that.desc = _desc;
        that.course = _course;
        that.dueDate = _due;
        that.notifyCode = (_due === null ? "none" : _notify);
        that.notifyDate = (_due === null ? null : makeNotifyDate(_due, _notify));
        that.id = md5(_name + "-" + _course);  // unique id by hashing the title and course together
        // return the extended object
        return that;
    }
    /**
     * Constructor for a single course object
     * Invoked w/out the 'new' keyword: `var courseObj = makeCourse(...);`
     * @param  {string} _name
     * @param  {string} _title
     * @param  {string} _instructor
     * @param  {string} _location
     * @param  {string} _times
     * @return {Course Object}
     */
    function makeCourse (_name, _title, _instructor, _location, _times) {
        var that = Object.create(null);
        // basic properties
        that.name = _name;
        that.title = _title;
        that.instructor = _instructor;
        that.location = _location;
        that.times = _times;

        return that;
    }
    /**
     * Creates a date object for a task notification date by comparing
     * the provided due date and notification diff code (e.g. 7d -> 7 days prior)
     * @param  {Date} due  Due date object (can be null)
     * @param  {String} code indicates user notification selection
     * @return {Date}      Date object representing when a notification should occur
     */
    function makeNotifyDate (due, code) {
        var dueMs, notifyMs;
        if (due === null || due === undefined ||
            code === null || code === undefined) {
            return null;
        }
        dueMs = due.getTime();
        notifyMs = notifyCodes[code].ms;
        if (notifyMs === undefined) {
            return null;
        }
        return new Date(dueMs - notifyMs);
    }
    /**
     * Used to initialize the 'courseList' object.
     * This function should only be called ONCE, after the database has been initialized.
     * (courseList ought to be a singleton, but is not because its initialization depends
     * on database initialization.)
     * @return {Course List Object}
     */
    function initCourseList () {
        // private ibject mapping course name/ids to course objects
        var allCourses = {};
        // initialize the above from the db when we create the object
        html5sql.process(
            [{
                "sql": "Select * From Classes Where cname != 'none'",
                "data": [],
                "success": function (transaction, result) {
                    var i = 0, rl = result.rows.length, r, someClass;
                    for (i; i < rl; i += 1) {
                        r = result.rows.item(i);
                        someClass = makeCourse(r.cname, r.ctitle, r.instructor, r.location, r.times);
                        allCourses[someClass.name] = someClass;
                    }
                }
            }],
            function () {
                builders.updateCourseListDom();
                builders.updateCourseTaskListDom();
            },
            app.logSqlError
        );
        // return public methods in an object literal
        return {
            /**
             * Adds a course to list and database, calls dom update method on success.
             * @param {Course Object} course
             */
            saveCourse: function (course) {
                html5sql.process(
                    [{
                        "sql": "Insert or Replace into Classes Values (?, ?, ?, ?, ?)",
                        "data": [ course.name, course.title, course.instructor, course.location, course.times ],
                        "success": function (transaction, results) {} // don't care...
                    }],
                    function () {
                        allCourses[course.name] = course;
                        builders.updateCourseListDom();
                    },
                    app.logSqlError
                );
            },
            /** TODO: not used
             * Update the attributes of an existing course in the list and database.
             * Calls dom updater method on successful update.
             * @param  {String} courseId
             * @param  {String} newTitle
             * @param  {String} newIns
             * @param  {String} newLoc
             * @param  {String} newTime
             * @return {undefined}
             */
            editCourse: function (courseId, newTitle, newIns, newLoc, newTime) {
                html5sql.process(
                    [{
                        "sql": "Update Classes Set ctitle = ?, instructor = ?, location = ?, times = ? Where cname = ?",
                        "data": [ newTitle, newIns, newLoc, newTime, courseId ],
                        "success": function (transaction, results) {}
                    }],
                    function () {
                        // update in list
                        allCourses[courseId].title = newTitle;
                        allCourses[courseId].instructor = newIns;
                        allCourses[courseId].location = newLoc;
                        allCourses[courseId].times = newTime;
                        // trigger dom refresh
                        builders.updateCourseListDom();
                    },
                    app.logSqlError
                );
            },
            /**
             * Remove a course from this list and from the database, AS WELL AS
             * deleting all assignments associated with that class.
             * Calls a dom update method after success.
             * @param  {String} courseId
             * @return {undefined}
             */
            deleteCourse: function (courseId) {
                html5sql.process(
                    [{
                        "sql": "Delete From Assignments Where course = ?",
                        "data": [ courseId ],
                        "success": function (transaction, results) {}
                    },
                    {
                        "sql": "Delete From Classes Where cname = ?",
                        "data": [ courseId ],
                        "success": function (transaction, results) {}
                    }],
                    function () {
                        delete allCourses[courseId];
                        taskList.deleteTasksByCourse(courseId);
                        builders.updateCourseListDom();
                        // TODO: also update assignment list gui/view/bits
                    },
                    app.logSqlError
                );
            },
            /**
             * Deletes (almost) everything - all classes, and therefore all assignments for those classes.
             * @return {undefined}
             */
            deleteAllCourses: function () {
                for (var courseId in allCourses) {
                    if (allCourses.hasOwnProperty(courseId)) {
                        courseList.deleteOne(courseId);
                    }
                }
            },
            /**
             * Retrieve a course object from the list by id/name
             * @param  {String} courseId
             * @return {Course Object}
             */
            getCourse: function (courseId) {
                return allCourses[courseId];
            },
            /**
             * Retrieve an array of all courses stored in this list
             * @return {Array(CourseObject)}
             */
            getAllCourses: function () {
                var res = [];
                for (var id in allCourses) {
                    if (allCourses.hasOwnProperty(id)) {
                        res.push(allCourses[id]);
                    }
                }
                return res;
            },
            /**
             * Retrieve an array of just the ids of courses stored in this list.
             * @return {Array(String)}
             */
            getCourseIds: function () {
                var id, idArr = [];
                for (id in allCourses) {
                    if (allCourses.hasOwnProperty(id)) {
                        idArr.push(id);
                    }
                }
                return idArr;
            }
        };  // end public courseList methods
    }
    /**
     * Constructor for the taskList object.  This function should
     * only be called ONCE, after the database has been initialized.
     * @see initCourseList
     * @return {Task List Object}
     */
    function initTaskList () {
        // private mapping of task ids (md5 of name and class) task objects
        var allTasks = {};
        /**
         * Sorts an array of task objects by date and returns sorted copy.
         * TODO: possibly sorting in the reverse order that we want?
         * @param  {Array(Task Object)} tasks
         * @return {Array(Task Object)}
         */
        function sortByDate (tasks) {
            var map = tasks.map(function (e, i) {
                return { index: i, value: (e.dueDate === null ? 0 : e.dueDate.getTime()) };
            });
            map.sort(function (a, b) {
                var av = a.value, bv = b.value;
                if (av < bv) {
                    return -1;
                }
                else if (av > bv) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
            var result = map.map(function (e) {
                return tasks[e.index];
            });
            return result;
        }
        // this call initializes the allTasks object map from the db
        html5sql.process(
            [{
                "sql": "SELECT name, description, course, dueDate, notifyCode FROM Assignments",
                "data": [],
                "success": function (transaction, result) {
                    var i = 0, rl = result.rows.length, r, oneTask, due, notify;
                    for (i; i < rl; i += 1) {
                        r = result.rows.item(i);
                        due = (r.dueDate === null ? null : new Date(r.dueDate));
                        oneTask = makeAssignment(r.name, r.description, r.course, due, r.notifyCode);
                        allTasks[oneTask.id] = oneTask;
                    }
                }
            }],
            function () {
                builders.updateTaskListDom();
                builders.updateCourseTaskListDom();
            },
            app.logSqlError
        );
        // returning public methods in an object literal
        return {
            /**
             * Saves new task/assignment
             * @param  {Task Object} taskObj
             * @return {undefined}
             */
            addTask: function (taskObj) {
                var dd = (taskObj.dueDate === null ? null : taskObj.dueDate.getTime());
                html5sql.process(
                    [{
                        "sql": "INSERT OR REPLACE INTO Assignments (name, description, course, dueDate, notifyCode) VALUES (?, ?, ?, ?, ?)",
                        "data": [ taskObj.name, taskObj.desc, taskObj.course, dd, taskObj.notifyCode ],
                        "success": function (transaction, result) {}
                    }],
                    function () {
                        allTasks[taskObj.id] = taskObj;
                        builders.updateTaskListDom();
                        builders.updateCourseTaskListDom();
                    },
                    app.logSqlError
                );
            },
            /**
             * Edits an existing task be taking the old id, deleting it, then adding a new object
             * @param  {string} oldId       id of task to replace
             * @param  {taskObj} replacement new task to put in place
             * @return {undefined}
             */
            editTask: function (oldId, replacement) {
                this.deleteTask(oldId);
                this.addTask(replacement);
            },
            /**
             * Removes a task from list and database
             * @param  {String} taskId
             * @return {undefined}
             */
            deleteTask: function (taskId) {
                var thisTask = allTasks[taskId],
                    thisName = thisTask.name,
                    thisCourse = thisTask.course;
                html5sql.process(
                    [{
                        "sql": "DELETE FROM Assignments WHERE name = ? AND course = ?",
                        "data": [ thisName, thisCourse ],
                        "success": function (transaction, result) {}
                    }],
                    function () {
                        delete allTasks[taskId];
                        builders.updateTaskListDom();
                        builders.updateCourseTaskListDom();
                    },
                    app.logSqlError
                );
            },
            /**
             * Removes all tasks, but not the courses
             * @return {undefined}
             */
            deleteAllTasks: function () {
                for (var id in allTasks) {
                    if (allTasks.hasOwnProperty(id)) {
                        deleteTask(id);
                    }
                }
            },
            /**
             * Removes all assignments associated with a course
             * @param  {String} courseId
             * @return {undefined}
             */
            deleteTasksByCourse: function (courseId) {
                for (var id in allTasks) {
                    if (allTasks.hasOwnProperty(id) &&
                        allTasks[id].course === courseId) {
                        deleteTask(id);
                    }
                }
            },
            /**
             * Retrieves a task object from the list by identifier
             * @param  {String} taskId
             * @return {Task Object}
             */
            getTask: function (taskId) {
                return allTasks[taskId];
            },
            /**
             * Retrieve an array of all tasks, ordered by date
             * @return {Array(Task Object)}
             */
            getAllByDate: function () {
                var id,
                    res = [];
                for (id in allTasks) {
                    if (allTasks.hasOwnProperty(id)) {
                        res.push(allTasks[id]);
                    }
                }
                return sortByDate(res);
            },
            /**
             * Retrieve an object mapping class names to arrays of tasks
             * @return {Object { id: Array(Task Object)}}
             */
            getAllByClass: function () {
                var id, cname, task, res = {};
                // add every task to an array accessed by course attribute of the task
                for (id in allTasks) {
                    if (allTasks.hasOwnProperty(id)) {
                        task = allTasks[id];
                        cname = task.course;
                        // if the result object doesn't have an array for this course name yet, make one
                        if (res[cname] === undefined) {
                            res[cname] = [];
                        }
                        res[cname].push(task);
                    }
                }
                // sort each subarray by date
                for (cname in res) {
                    if (res.hasOwnProperty(cname)) {
                        res[cname] = sortByDate(res[cname]);
                    }
                }
                return res;
            }
        };
    }
    /**
     * Externally accessible namespace - functions in this object can be called 
     * from html (debug console) as `app.funcName();`
     * @type {Object}
     */
    window.app = {
        /**
         * Application entry point, called from bottom of HTML document
         * @return {undefined}
         */
        initialize: function () {
            this.bindEvents();
        },
        /**
         * Bind any events that are required on startup. 
         * ('load'.'deviceready', 'online', 'offline', etc.)
         * @return {undefined}
         */
        bindEvents: function () {
            document.addEventListener('deviceready', app.onDeviceReady, false);
            // bind for deleting everything
            $("#delete-everything").on("click",app.dropTables);
            $("#delete-everything").on("click",app.onDeviceReady);
            // TODO: these events only need to be bound after db init?
            $("#edit-class").on("popupafterclose", app.classPopupOnCloseHandler);
            $("#edit-class-delete").on("click", app.classPopupDeleteHandler);
            $("#edit-class-save").on("click", app.classPopupSaveBtnHandler);
            $("#add-new-task-btn").on("click", app.addNewTaskHandler);
            $("#edit-task").on("popupafterclose", app.taskPopupOnCloseHandler);
            $("#edit-task-delete").on("click", app.taskPopupDeleteHandler);
        },
        /**
         * Initializes the local storage database.
         * Creates or connects to db via the html5sql.openDatabase method,
         * and creates our tables if they don't yet exist
         * @return {undefined}
         */
        initializeLDB: function () {
            html5sql.openDatabase("edu.radford.agenda.db", "RU-Agena-DB", 1024 * 1024 * 5);
            html5sql.process(
                [
                    "CREATE TABLE IF NOT EXISTS Classes ( cname TEXT PRIMARY KEY NOT NULL, ctitle TEXT DEFAULT '' NOT NULL, instructor TEXT, location TEXT, times TEXT );",
                    "CREATE TABLE IF NOT EXISTS Assignments ( name TEXT NOT NULL, course TEXT NOT NULL REFERENCES Classes(cname), description TEXT DEFAULT '', dueDate INTEGER, notifyCode TEXT, CONSTRAINT task_class_pk PRIMARY KEY(name, course));"
                ],
                function () {
                    console.log("Initialized local database tables");
                    courseList = initCourseList();
                    taskList = initTaskList();
                },
                app.logSqlError
            );
        },
        /**
         * Handles the phonegap 'deviceready' event.  The Phongap api is not ready to
         * take calls until the deviceready event has fired!
         * @return {undefined}
         */
        onDeviceReady: function () {
            app.initializeLDB();
            $("#tdue").datepicker("option", "showAnim", "");
            // i don't know why this is has to be here... but wierd things happen without it.
            $("#tdue").datepicker("show");
            $("#tdue").datepicker("hide");
        },
        /**
         * Bound to the onclick event for the "Add new class" item at the
         * bottom of the class list.  Displays an "Add new class" popup
         * @return {undefined}
         */
        addNewClassHandler: function () {
            // hide the delete/remove button
            $("#edit-class-delete").hide();
            // enable the class title field
            $("#edit-class-id").prop("disabled", false);
            // set the 'legend' text
            $("div#edit-class h3").text("Add a new class");
            // now open the popup
            $("#edit-class").popup("open");
        },
        /**
         * Handler bound class list, catches onclick events produced by class list items.
         * Displays the view/edit detail popup for the selected class list item.
         * @param  {Event} event
         * @return {undefined}
         */
        editClassHandler: function (event) {
            var lid, cls;
            // show the delete/remove button
            $("#edit-class-delete").show();
            // disable editing the name/id of the class (it's the key)
            $("#edit-class-id").prop("disabled", true);
            // set the 'legend' text
            $("div#edit-class h3").text("Edit class");
            // need to pre-populate the form w/ values
            lid = event.currentTarget.id;
            cls = courseList.getCourse(lid);
            $("#edit-class-id").val(cls.name);
            $("#edit-class-title").val(cls.title);
            $("#edit-class-who").val(cls.instructor);
            $("#edit-class-where").val(cls.location);
            $("#edit-class-when").val(cls.times);
            // now open the popup
            $("#edit-class").popup("open");
        },
        /**
         * Handles the onlick event for the 'Delete' button in the "Edit class" popup
         * @return {undefined}
         */
        classPopupDeleteHandler: function () {
            var cid = $("#edit-class-id").val();
            if (cid !== "") {
                courseList.deleteCourse(cid);
            }
            $("#edit-class").popup("close");
        },
        /**
         * Handles the onclick even for the "Save" button in the Add New Class popup
         * @return {undefined}
         */
        classPopupSaveBtnHandler: function () {
            var section = makeCourse(
                $("#edit-class-id").val(),
                $("#edit-class-title").val(),
                $("#edit-class-who").val(),
                $("#edit-class-where").val(),
                $("#edit-class-when").val()
            );
            /* rudimentary opaque validation, no empty class names allowed */
            if (section.name !== "") {
                courseList.saveCourse(section);
            }
            $("#edit-class").popup("close");
        },
        /**
         * When the class new/detail popup closes, clear its fields
         * @return {undefined}
         */
        classPopupOnCloseHandler: function (/*event, ui*/) {
            $("#edit-class :text").val("");
        },
        addNewTaskHandler: function () {
            // hide the delete/remove button
            $("#edit-task-delete").hide();
            // set the 'legend' text
            $("div#edit-task h3").text("Add a new Assignment");
            $("#edit-task-name").text("");
            $("#edit-task-description").text("");
            // set save handler
            $("#edit-task-save").off("click");
            $("#edit-task-save").on("click", app.taskPopupSaveBtn_WhenNew);
            // update the class options
            builders.updateCourseDropdown();
            // now open the popup
            $("#edit-task").popup("open");
        },
        editTaskHandler: function (event) {
            var lid, task;
            // show the delete/remove button
            $("#edit-task-delete").show();
            // set the 'legend' text
            $("div#edit-task h3").text("Edit Assignment");
            // set save handler
            $("#edit-task-save").off("click");
            $("#edit-task-save").on("click", app.taskPopupSaveBtn_WhenEdit);
            // update the class options
            builders.updateCourseDropdown();
            // need to pre-populate the form w/ values
            lid = event.currentTarget.id;
            task = taskList.getTask(lid);
            $("#edit-task-id").val(lid);
            $("#tname").val(task.name);
            $("#tdesc").val(task.desc);
            $("select#tcourse option").removeAttr("selected");
            $("select#tcourse option[value='" + task.course + "']").attr("selected", "selected");
            $("select#tcourse").selectmenu("refresh");
            $("#tdue").datepicker("setDate", task.dueDate);
            $("select#tcourse option[value='" + task.notifyCode + "']").attr("selected", "selected");
            // now open the popup
            $("#edit-task").popup("open");
        },
        taskPopupDeleteHandler: function () {
            var lid = $("#edit-task-id").val();
            if (lid !== "") {
                taskList.deleteTask(lid);
            }
            $("#edit-task").popup("close");
        },
        taskPopupSaveBtn_WhenNew: function () {
            var section = makeAssignment(
                $("#tname").val(),
                $("#tdesc").val(),
                $("#tcourse").val(),
                $("#tdue").datepicker("getDate"),
                $("#tnotify").val()
            );
            /* rudimentary opaque validation, no empty task names allowed */
            if (section.name !== "") {
                taskList.addTask(section);
            }
            $("#edit-task").popup("close");
        },
        taskPopupSaveBtn_WhenEdit: function () {
            var oldId = $("#edit-task-id").val();
            var section = makeAssignment(
                $("#tname").val(),
                $("#tdesc").val(),
                $("#tcourse").val(),
                $("#tdue").datepicker("getDate"),
                $("#tnotify").val()
            );
            /* rudimentary opaque validation, no empty task names allowed */
            if (section.name !== "") {
                taskList.editTask(oldId, section);
            }
            $("#edit-task").popup("close");
        },
        taskPopupOnCloseHandler: function (/*event, ui*/) {
            $("#edit-task :text").val("");
            $("#tdue").datepicker("hide");
        },
        /* generic and mostly useless SQL error printing callback */
        logSqlError: function (error, statement) {
            console.log(error);
            console.log(statement);
        },
        /* these are for debugging, call them from the console */
        makeSampleClasses: function () {
            var someClasses = [
                makeCourse("ITEC 110", "Principles of Information Technology", "Dr. Htay", "MG 203", "TR 3:30 - 4:45 PM"),
                makeCourse("ITEC 120", "Principles of Computer Science I", "Dr. Braffitt", "DA 225", "MWRF 11 - 11:50 AM"),
                makeCourse("MATH 151", "Calculus I", "Cabbage", "RU 314", "MWF 1 - 1:50 PM"),
                makeCourse("ART 111", "Art Appreciation", "Pop", "Porterfield", "MWF 9 - 9:50 AM")
            ], i = 0, scl = someClasses.length;
            for (i; i < scl; i += 1) {
                courseList.saveCourse(someClasses[i]);
            }
        },
        makeSampleAssignments: function () {
            var someTasks = [
                makeAssignment("p1", "Programming assignment 1", "ITEC 110", new Date(), "none"),
                makeAssignment("Homework 2", "Chapter 3 problems 15-30", "MATH 151", new Date(), "none"),
                makeAssignment("paint", "finish masterpiece", "ART 111", new Date(), "none"),
                makeAssignment("Quiz", "Quiz on chapter 3", "MATH 151", new Date(), "none"),
            ], i = 0, sTask = someTasks.length;
            for(i; i < sTask; i += 1) {
                taskList.addTask(someTasks[i]);
            }
        },
        dropTables: function () {
            html5sql.process(
                [
                    "DROP TABLE Classes",
                    "DROP TABLE Assignments"
                ],
                function () {
                    console.log("dropped all tables");
                },
                app.logSqlError
            );
        }
    }; // end window.app object
    /**
     * Object containing the methods that manipulate the DOM 
     * (mostly building lists to display) and some private helper methods.
     * Note: could be defined as a straightforward object literal like the app object,
     * but I don't want to forget how to declare a singleton.
     * @return {Object}
     */
    var builders = (function () {
        /**
         * Builds an HTML string for a single item in the list of courses/classes
         * @param  {Course Object} cls
         * @return {String}
         */
        var getCourseListItem = function (cls) {
            var strPieces = ["<li><a id='", cls.name,
                "' class='class-list-item' href='#'>", cls.name, "<p><strong>",
                cls.title, "</strong></p><p>", cls.instructor, "</p><p>",
                cls.location, "</p><p>", cls.times, "</p></a></li>"];
            return strPieces.join("");
        },
        /**
         * Builds HTML string for a single item in the *main* list of tasks
         * (tab one - all assignments ordered by date)
         * @param  {Task Object} taskObj
         * @return {String}
         */
        getMainTaskListItem = function (taskObj) {
            var dueDateStr = (taskObj.dueDate === null ? "" : "Due: " + taskObj.dueDate.toDateString()),
                notifyDateStr = (taskObj.notifyDate === null ? "" : taskObj.notifyDate.toDateString()),
                notifyStr =  notifyCodes[taskObj.notifyCode].display,
                strPieces = ["<li><a href='#' id='", taskObj.id, "' class='task-list-item'>",
                    taskObj.name, "<p>", taskObj.course, "<br />", dueDateStr,
                    "</p><p class='ui-li-aside'>", taskObj.desc, "<br />",
                    notifyStr, "<br />", notifyDateStr, "</p></a></li>"];
            return strPieces.join("");
        },
        /**
         * Builds html for a list of assignments inside a task collapsible
         * @param  {Array} taskArr array of task objects
         * @return {String}         html for series of List Items
         */
        getCourseTaskList = function (taskArr) {
            var items = [],
                i = 0,
                al = taskArr.length;
            for (i; i < al; i += 1) {
                items.push(getCourseTaskListItem(taskArr[i]));
            }
            return items.join("");
        },
        /**
         * Generates html for a single list item in the list of assignments
         * for one class (inside a collapsible in tab two)
         * @param  {Task Obj} task A task object
         * @return {String}      html for a single list item
         */
        getCourseTaskListItem = function (task) {
            var pieces = ["<li><a href='' class='task-list-item' id='",
                task.id, "'>", task.name, "<p class='ui-li-aside'>",
                (task.dueDate === null ? "" : "Due: " + task.dueDate.toDateString()),
                "</p></a></li>"];
            return pieces.join("");
        },
        /**
         * Returns raw html for one select option 
         * @param  {string} cid the course id for the option element
         * @return {string}     html for single select option, value and text = cid
         */
        getCourseOptionHtml = function (cid) {
            var pieces = ["<option value='", cid, "'>", cid, "</option>"];
            return pieces.join("");
        },
        /**
         * Creates html for a class collapsible in the second tab
         * @param  {String} cid     course id 
         * @param  {Array} taskArr array of assignments for this class
         * @return {String}         html for collapsible div
         */
        getClassCollapsibleHtml = function (cid, taskArr) {
            var pieces = ["<div data-role='collapsible' id='", cid,
            "' data-inset='false' data-collapsed-icon='carat-d' data-expanded-icon='carat-u'>\n",
            "<h3>", cid, "<span class='ui-li-count'>", taskArr.length, "</span></h3>\n",
            "<ul data-role='listview' data-icon='edit'>\n",
            getCourseTaskList(taskArr), "</ul></div>"];
            return pieces.join("");
        };
        return {
            /**
             * Rebuilds the jQuery Mobile ListView displayed in the third tab of the
             * main interface (list of all classes/courses)
             * @return {undefined}
             */
            updateCourseListDom: function () {
                var id, oneClass, $newBits,
                    allClasses = courseList.getAllCourses(),
                    $addBtn = $("<li data-icon='plus'><a href='#' id='add-new-class-btn'>Add a new class</a></li>");
                $("ul#classList").empty();
                for (id in allClasses) {
                    if (allClasses.hasOwnProperty(id)) {
                        oneClass = allClasses[id];
                        $newBits = $(getCourseListItem(oneClass));
                        $("ul#classList").append($newBits);
                    }
                }
                $("ul#classList").append($addBtn);
                $("#add-new-class-btn").on("click", app.addNewClassHandler);
                $("ul#classList").on("click", "li a.class-list-item", app.editClassHandler);
                $("ul#classList").listview("refresh");
            },
            /**
             * Rebuilds the jQuery Mobile ListView displayed in the first tab of the main
             * interface (list of all assignments ordered by date)
             * @return {undefined}
             */
            updateTaskListDom: function () {
                var id, oneTask, $newBits,
                    allTasks = taskList.getAllByDate();
                $("ul#mainTaskList").empty();
                for (id in allTasks) {
                    if (allTasks.hasOwnProperty(id)) {
                        oneTask = allTasks[id];
                        $newBits = $(getMainTaskListItem(oneTask));
                        $("ul#mainTaskList").append($newBits);
                    }
                }
                $("ul#mainTaskList").on("click", "li a.task-list-item", app.editTaskHandler);
                $("ul#mainTaskList").listview("refresh");
            },
            /**
             * Updates the course select options in the new/edit task popup
             * @return {undefined}
             */
            updateCourseDropdown: function () {
                var opts, len, i;
                opts = courseList.getCourseIds();
                len = opts.length;
                i = 0;
                $("select#tcourse").empty();
                for (i; i < len; i += 1) {
                    $("select#tcourse").append($(getCourseOptionHtml(opts[i])));
                }
                $("select#tcourse option:first").attr("selected", "selected");
                $("select#tcourse").selectmenu("refresh");
            },
            /**
             * Updates tab two (course collapsibles containing assignment lists)
             * @return {undefined}
             */
            updateCourseTaskListDom: function () {
                var id, map, collapsible;
                $("div#two").empty();
                map = taskList.getAllByClass();
                for (id in map) {
                    if (map.hasOwnProperty(id)) {
                        collapsible = getClassCollapsibleHtml(id, map[id]);
                        $(collapsible).appendTo("div#two");
                    }
                }
                $("div[data-role='collapsible']").on("click", "li a.task-list-item", app.editTaskHandler);
                $("div#two").enhanceWithin();
            }
        };    // end builders public methods
    }());    // end builders singleton
}(this));   // end everything
