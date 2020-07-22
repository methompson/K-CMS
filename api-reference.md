# API Reference

By default all API endpoints begin with an api endpoint. Each section also has its default path:

| Section | End Point|
| - | - |
| User | /api/user/ |
| Page | /api/pages/ |
| Blog | /api/blog/ |

Many API end points require that a user be logged in. KCMS uses JWTs (JSON Web Tokens) to manage login state for a user. Any API that requires user credentials accept the token as part of the request's header in the following format:

```
authorization: Bearer {JWT Token}
```

## User API End Points

## Get User

Gets information about a user based on the id url parameter. If the id parameter is not provided, the server will respond with a 400 code.

`GET /api/user/get-user/{id}`

Authorization Level: Users with the 'view' permission

___

## Get All Users

Gets a list of all users.

`GET /api/user/all-users`

Authorization Level: Users with the 'edit' permission

___

## Get User Types

Gets all user types. This can be used for creating a UI for add new users.

`GET /api/user/get-user-types`

Authorization Level: Users with the 'edit' permission

___

## Login

`POST /api/user/login`

Authorization Level: None

### **Available Parameters**

| Name | Type | Required | Comments |
| -    | -    | -        | -        |
| username | String | yes | The username of the user logging |
| password | String | yes | The password of the user logging |

Example:
```json
{
  "username": "myUsername",
  "password": "myPassword"
}
```
___

## Add a User

`POST /api/user/add-user`

Authorization Level: Users with the 'edit' permission

### **Available Parameters**

| Name 			| Type 		| Required 	| Comments |
| -    			| -    		| -        	| -        |
| username 	| String 	| yes 			|  |
| password 	| String 	| yes 			|  |
| email 		| String 	| yes 			|  |
| userType 	| String 	| no 				| Defaults to 'Subscriber' |
| enabled 	| Boolean | no 				| Defaults to 'true' |
| firstName | String 	| no 				| Defaults to an empty string |
| lastName 	| String 	| no 				| Defaults to an empty string |
| userMeta 	| Object 	| no 				| Defaults to an empty object |

Example:
```json
{
	"newUser": {
		"username": "newUser",
		"password": "password",
		"userType": "subscriber",
		"email": "testsub@test.test",
		"userMeta": {}
	}
}
```
___

## Edit a User

`POST /api/user/edit-user`

Authorization Level: Users with the 'edit' permission

| Name 								| Type 		| Required	| Comments |
| -    								| -    		| -       	| -        |
| id 									| String 	| yes 			| id of the user being updated. |
| currentUserPassword | String 	| Yes 			| password of the user making the udpate. |
| username			 			| String 	| no 				| Must be unique. |
| password			 			| String 	| no 				| |
| email 							| String 	| no 				| Must be unique. |
| userType			 			| String 	| no 				| |
| enabled 						| Boolean | no 				| |
| firstName 					| String 	| no 				| |
| lastName 						| String 	| no 				| |
| userMeta 						| Object 	| no 				| |

Example:
```json
{
	"currentUserPassword": "currentUserPassword",
	"updatedUser": {
		"id": "37",
		"username": "updatedUserName",
		"password": "updatedUserPassword",
		"userType": "editor"
	}
}
```
___

## Delete a User

`POST /api/user/delete-user`

Authorization Level: Users with the 'edit' permission

| Name 	| Type 		| Required 	| Comments |
| -    	| -    		| -        	| -        |
| id 		| String 	| yes 			| id of the user being updated. |

Example:
```json
{
	"deletedUserId": "29"
}
```
___

## Page API End Points

## Get Page

`GET /api/pages/get-page/{pageId}`

Authorization Level: Any (Page with enabled set to false require users with 'edit' permission)

___

## Get All Pages

`GET /api/pages/all-pages`

Authorization Level: Any (Page with enabled set to false require users with 'edit' permission)

___

## Get Page By Slug

`GET /api/pages/{slug}`

Authorization Level: Any (Page with enabled set to false require users with 'edit' permission)

___

## Add New Page

`POST /api/pages/add-page`

Authorization Level: Users with the 'edit' permission

### **Available Parameters**

| Name    | Type    | Required | Comments |
| -       | -       | -        | -        |
| name    | string  | yes			 | The name of the page to be displayed in the administration panel. |
| slug    | string  | yes 		 | The slug used in the page's url. Must be unique. |
| enabled | boolean | yes 		 | A boolean value representing whether the page is available publicly. |
| content | array   | yes   	 | The data of the page, representted as an array of page content objects. |
| meta    | object  | no  		 | Additional information about the page that doesn't fit into the above data. |

Example:
```json
{
	"page": {
		"slug": "my-page",
		"name": "My Page",
		"enabled": true,
		"content": [],
		"meta": {}
	}
}
```
___

## Edit Page

`POST /api/pages/edit-page`

Authorization Level: Users with the 'edit' permission

### **Available Parameters**

| Name    | Type    | Required	| Comments |
| -       | -       | -					| -        |
| id		  | string	| yes				|
| name    | string  | no				| The name of the page to be displayed in the administration panel. |
| slug    | string  | no	 			| The slug used in the page's url. Must be unique. |
| enabled | boolean | no	 			| A boolean value representing whether the page is available publicly. |
| content | array   | no				| The data of the page, representted as an array of page content objects. |
| meta    | object  | no				| Additional information about the page that doesn't fit into the above data. |

Example:
```json
{
	"page": {
		"id": "20",
		"slug": "your-page",
		"name": "Your Page",
		"enabled": true,
		"content": [],
		"meta": {}
	}
}
```
___

## Delete Page

`POST /api/pages/delete-page`

Authorization Level: Users with the 'edit' permission

### **Available Parameters**

| Name	| Type		| Required	| Comments	|
| -			| - 			| -					| -					|
| id		| string	| yes				| |

Example:
```json
{
	"page": {
		"id": 10
	}
}
```
___

## Blog API End Points

### Get All Blog Posts

`GET /api/blog/{slug}`

Authorization Level: Any (Blogs with enabled set to false require users with 'edit' permission)
___

### Get Blog Post By Slug

`GET /api/blog/all-blog-posts`

Authorization Level: Any (Blogs with enabled set to false require users with 'edit' permission)
___

### Add Blog Post

`POST /api/blog/add-blog-post`

Authorization Level: Users with the 'edit' permission

### **Available Parameters**

| Name		| Type 		| Required	| Comments |
| -				| -    		| -					| -        |
| name		| string	| yes				||
| slug		| string	| yes				| Must Be Unique.|
| draft		| boolean	| yes				| Determines if the blog post is a draft and not published|
| public	| boolean	| yes				| Determines if the blog post is visible to the public|
| content	| array		| yes				||
| meta		| object	| no				||

**Example:**
```json
{
	"blogPost": {
		"name": "My Blog Post",
		"slug": "my-blog-post",
		"draft": true,
		"public": false,
		"content": [],
		"meta": {}
	}
}
```
___

### Edit Blog Post

`POST /api/blog/edit-blog-post`

Authorization Level: Users with the 'edit' permission

### **Available Parameters**

| Name		| Type 		| Required	| Comments |
| -				| -    		| -					| -        |
| id			| string	| yes				||
| name		| string	| no				||
| slug		| string	| no				| Must Be Unique.|
| draft		| boolean	| no				| Determines if the blog post is a draft and not published|
| public	| boolean	| no				| Determines if the blog post is visible to the public|
| content	| array		| no				||
| meta		| object	| no				||

**Example:**
```json
{
	"blogPost": {
		"id": "20",
		"name": "My New Blog Post",
		"slug": "my-new-blog-post",
		"draft": false,
		"public": true,
		"content": [],
		"meta": {}
	}
}
```

___

### Delete Blog Post

`POST /api/blog/delete-blog-post`

Authorization Level: Users with the 'edit' permission

### **Available Parameters**

| Name	| Type 		| Required	| Comments |
| -			| -				| -					| -        |
| id		| string	| yes				||

**Example:**
```json
{
	"blogPost": {
		"id": "20",
	}
}
```