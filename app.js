const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors=require("cors");
require('dotenv').config();

const _=require("lodash");

const app = express();


app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const api_key=process.env.API_KEY
mongoose.connect("mongodb+srv://"+api_key);
const itemsSchema = new mongoose.Schema({
  name: String,
});
const Item = mongoose.model("item", itemsSchema);

const item1 = new Item({
  name: "Hey, there!! Welcome to Todo-List",
});

const item2 = new Item({
  name: "press on + to add items to this list",
});

const item3 = new Item({
  name: "<------- click here to delete the items from the list",
});

const defaultItems = [item1, item2, item3];
//HERE WE WILL BE CREATING A SCHEMA FOR CUSTOM LISTS MADE BY THE USER BY ENTERING DIFFERENT URLS 
//FOR EACH NEW LIST THE LIST WILL HAVE A NAME AND WILL ALSO HAVE DEFAULT LIST ITEMS ADDED TO IT (ITEM1, ITEM2, ITEM3)
//FOR THIS PURPOSE WE NEED TO MAKE A FIELD OF SCHEMA AS ARRAY OF ITEMSSCHEMA BECAUSE IF A FIELD WILL HAVE 
//ARRAY OF ITEM SCHEMAS THEN IT CAN STORE defaultItems ARRAY IN IT LATER ON HENCE
const listSchema=new mongoose.Schema({
  name:String,
  items: [itemsSchema]
});
const List= mongoose.model("list",listSchema);

app.get("/", function (req, res) {

  Item.find({}, function (err, result) {
    //FIRST ARGUMENT OF FIND IS EMPTY AS IT CONTAINS CONDITION FOR WHAT TO FIND
    //BUT IN OUR CASE WE HAVE TO FIND EVERYTHING IN THE COLLECTION HENCE WE HAVE KEPT IT EMPTY

    // AN IMPORTANT THING TO KEEP IN MIND IS THAT WE ONLY WANT TO INSERT THE DEFAULT LIST ITEMS IN THE
    // DATABASE ONCE THE WEBPAGE IS LOADED FOR THE FIRST TIME WE DON'T WANT DEFAULT ITEMS TO BE INSERTED IN THE DATABASE
    // EVERYTIME THE SERVER IS RESET OR RESTARTED AND FOR THIS TO HAPPEN WE NEED TO CHECK A CONDITION THAT IF
    // THE RESULT FOUND OUT BY .FIND ON ITEM MODEL WHICH BY DEFAULT OR ONCE THE WEBPAGE IS LOADED THE FIRST
    // TIME WILL BE AN EMPTY ARRAY THAT WILL BE STORED IN RESULT THUS IF RESULT.LENGTH===0 HENCE THE WEBPAGE IS LOADED
    // FOR THE FIRST TIME AND DEFAULT VALUE WILL BE INSERTED IN THE ARRAY AND THUS THE INSERTMANY FUNCTION WILL BE
    // PUT IN THE ELSE PART OF THE .FIND FUNCTION
    if (result.length === 0) {
      Item.insertMany(defaultItems, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("elemnts successfully saved in the DB");
        }
      });

      //HERE WE WILL ENCOUNTER ONE MORE PROBLEM BECAUSE EVEN AFTER INSERTING THE DATA IN THE DATABASE THE WEBPAGE
      //WILL NOT RENDER THE DEFAULT ELEMENTS THAT HAVE BEEN INSERTED THE REASON BEING THAT WE ARE ONLY INSERTING
      //DATA IN THE IF CONDITION OF INSERTMANY WE ARE NOT RENDERING THE CHANGES AND TO SOLVE THIS PROBLEM WE NEED TO
      //WRITE RES.REDIRECT("/") IN THE IF CONDITION OF RES.LENGTH ===0 CONDITION BECAUSE AS SOON AS THE ELEMENT WILL BE INSERTED
      //IN THE DATABASE THE RESULT ARRAY WONT BE EMPTY ANYMORE AND HENCE THE ELSE CONDITION WILL GET EXECUTED THUS
      //RENDERING THE PAGE WITH DEFAULT ELEMENTS INSERTED IN OUR TO DO LIST
      return res.redirect("/");
    } else {
      return res.render("list", { listTitle: "TO-DO LIST", newListItems: result }); // HERE WE ARE PASSING THE RESULTS OF .FIND
      //ON THE Item MODEL WHICH IS AN ARRAY OF DOCUMENTS THEN PASSING THEM OVER TO newListItems IN LIST.EJS
    }
  });
});

app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName=req.body.list;//here we are accessing the name of the list in which elements get added
  //the new item will be created regardless of which list was accessed hence a new item is being created
  const item= new Item({
    name: itemName,
  });
  if(listName==="Today"){//if element was addedd to the default list then simply save it to items collection
    //and redirect to root route
    item.save();
    // AGAIN REDIRECTING TO THE HOME ROUTE TO DISPLAY CHANGES ON THE SCREEN
    res.redirect("/");
  }

    else{//if the element was not added to the default list then we will use findOne to find the list
      //with the corresponding name as the lists is a collection and has name and array of default elements
      // as its field the the findOne method will return a document consisting of name and array and we will
      //. method to access that array then use push fn to insert this new element in the array of default
      //elements
      List.findOne({name:listName},function(err,foundList){
        if(!err){
          //foundList.items.push(itemName);//items array consist of item documents hence it will only store
          //items not itemName thus this will throw error
          foundList.items.push(item);
          foundList.save();
          res.redirect("/"+ listName);//redirecting to the custom list route
        }
      }); 

    }
});
 


//NOW WE NEED TO ADD A ROUTE FOR DELETING AN ELEMENT FROM THE TODO LIST
//THE DELETION OF ELEMENT FROM TO DO LIST SHOULD BE DONE AS SOON AS THE CHECKBOX BESIDE THE ITEM NAME IS CHECKED ON
//TO DO THIS WE WILL NEED TO DO SOME CHANGES IN OUR LIST.EJS AND CREATE A DELETE ROUTE
app.post("/delete",function(req,res){

  // console.log(req.body.checkbox);the checkbox will send a key value pair in doucment form
  //like {checkbox :'6329f3c33d8976e9feacb71f'} the name is key/name is checkbox because we have specified the
  //name as checkbox in the name field of checkbox input in list.ejs thus we are trying to make use of that _id
  //to delete that item from the database

  const checkedItemId=req.body.checkbox;
  const listName=req.body.listName;//the value from input="hidden" tag will be stored as list name 
  //if the listName is Today that means the element is added to the default list hence we can proceed like usual
  if(listName==="Today"){
    Item.findByIdAndRemove(checkedItemId,function(err){
      if(err){
        console.log(err);
      }
      else{
        console.log("Successfully deleted checked item");
        //again to reflect changes on webpage we need to use redirect as the element will be deleted from the
        //database but it won't be reflected on the webpage unless redirect function is called
        res.redirect("/");
      }
    });
  }
  else{//here comes a little complex part now where we have to iterate through all elements in the items array
    //in List model using for loop and then compairing each of the name in List model with the listName and then
    //delete it but there is a better method to solve this problem by combining query from mongoDB and mongoose
    //the queries that will be combined are $pull & findOneAndUpdate the way we combined them is such 
    //findOneAndUpdate takes 3 parameters first is the query ie what is the thing you want to find?
    //we will apply findOneAndUpdate on List and we will find the List whose name is equal to listName
    //second is updates it is the place where we will tell what updates you need to make here and this is the 
    //field where we will be actually combining our $pull query from mongoDB 
    //hence here by applying update we are pulling out which means this update is deleting element from item array
    //in List model
    //$pull itself has 2 fields it looks like $pull:{field:{query}} 
    //1:- in pull function field stands for what field you want to pull out the value form it is generally
    //an array in our case that array is items in List model 
    //2:- query is the value you want to pull out from that array in our case it will be the document that 
    //are stored in form of Item1, Item2, Item3 in items array and we will specify their _id to pull them
    //out like $pull:{items:{_id:checkedItemId(_id)}};
    List.findOneAndUpdate({name:listName},{$pull:{items:{_id:checkedItemId}}},function(err,results){
      if(!err){
        res.redirect("/"+listName);
      }
    });

  }

});

app.get("/about", function (req, res) {
  res.render("about");
});

app.get("/:customListName",function(req,res){

 /* this comment was added at the last so please read it after reading all other comments in this project
 after creating all the functionality in our todo list there is only one problem and that is that if user enters
 home as to create a home list and then types Homes in the url it creates a different list as Homes which is not 
 ideal we need to maintain a standard so that no matter what the user enters there must be some standard case 
 for url and for this purpose we will again use lodash and its ._capitalize method so that no matter what user
 inputs as url the first letter if that url will be capital and all other in lower case
 ex if user enters HOmE it will be changed to Home 
 or if home is entered it will be change to Home
 */
  const customListName= _.capitalize(req.params.customListName);

  // NOW HERE WE WILL ENCOUNTER ANOTHER PROBLEM AS HERE WE ARE CREATING A NEW LIST EVERYTIME USER ENTERS A NEW
  //URL LIKE /HOME, /WORK, /IMPORTANT BUT WHAT IF A PERSON ENTERS /HOME AND THEN GOES BACK TO HOME ROUTE AND
  //AGAIN WANTS TO SEE LIST AT /HOME ROUTE ----> WELL FOR NOW AS WE HAVE NOT IMPLEMENTED ANY LOGIC AS SOON AS
  //THE USER ENTERS /HOME AGAIN A NEW LIST AS HOME WILL BE CREATED AND THE LAST LIST CREATED AS HOME WON'T BE 
  //RENDERED & THUS TO SOLVE SUCH PROBLEM WE NEED TO IMPLEMENT SOME LOGIC USING CODE
  // const list=new List({
  //   name:customListName,
  //   item:defaultItems
  // });

  //WE WILL IMPLEMENT A LOGIC BY APPLYING FINDONE ON OUR LISTS COLLECTION WHERE WE WILL SEARCH FOR A NAME 
  //OF THE LIST THAT MATCHES WITH USER'S QUERY IF A LIST WITH SUCH NAME EXISTS IN OUR DATA BASE WE WILL RENDER IT
  //RATHER THAN CREATING IT AND IF IT DOES NOT THEN SIMPLY CREATE IT 

  List.findOne({name:customListName},function(err,result){//result will return a document with field
    //name and default list items (items)
    if(err){
      console.log(err);
    }
    else{
      if(result){//if result is found then that means the list with the name exists and we have to render it
       //render that list using ejs and the name of that list should be the customlistname hence
       res.render("list", { listTitle: customListName, newListItems: result.items });
      }
      else{//else create the list with that name 
          const list=new List({
      name:customListName,
      items:defaultItems
    });
    list.save();
    res.redirect("/"+customListName);//redirected to custom list name route
      }
    }

    });

});



app.listen(process.env.PORT || 3000, function () {
  console.log("Server started successfully");
});
