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

### Get User

Gets information about a user based on the id url parameter. If the id parameter is not provided, the server will respond with a 400 code.

`GET /api/user/get-user/{id}`

Authorization Level: Users with the 'view' permission

___

### Get All Users

Gets information on all users.

`GET /api/user/all-users`

Authorization Level: Users with the 'edit' permission

___

### Get User Types

Gets all user types. This can be used for creating a UI for add new users.

`GET /api/user/get-user-types`

Authorization Level: Users with the 'edit' permission

___

### Login

`POST /api/user/login`

Authorization Level: None

### Available Parameters

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

### Add a User

`POST /api/user/add-user`

Authorization Level: Users with the 'edit' permission

### Available Parameters

| Name | Type | Required | Comments |
| -    | -    | -        | -        |
| username | String | yes |  |
| password | String | yes |  |
| email | String | yes |  |
| userType | String | no | Defaults to 'Subscriber' |
| enabled | Boolean | no | Defaults to 'true' |
| firstName | String | no | Defaults to an empty string |
| lastName | String | no | Defaults to an empty string |
| userMeta | Object | no | Defaults to an empty object |

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

### Edit a User

`POST /api/user/edit-user`

Authorization Level: Users with the 'edit' permission

| Name | Type | Required | Comments |
| -    | -    | -        | -        |
| id | String | yes | id of the user being updated |
| currentUserPassword | String | Yes | password of the user making the udpate |
| data.username | String | no | |
| data.password | String | no | |
| data.email | String | no | |
| data.userType | String | no | |
| data.enabled | Boolean | no | |
| data.firstName | String | no | |
| data.lastName | String | no | |
| data.userMeta | Object | no | |

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

### Delete a User

`POST /api/user/delete-user`

Authorization Level: Users with the 'edit' permission

Authorization Level: Users with the 'edit' permission

| Name | Type | Required | Comments |
| -    | -    | -        | -        |
| id | String | yes | id of the user being updated |

Example:

```json
{
	"deletedUserId": "29"
}
```

___

## Page API End Points

### Get Page

`GET /api/pages/get-page/{pageId}`

___

### Get All Pages

`GET /api/pages/all-ages`

___

### Get Page By Slug

`GET /api/pages/{slug}`

___

### Add New Page

`POST /api/pages/add-page`

___

### Edit Page

`POST /api/pages/edit-page`

___

### Delete Page

`POST /api/pages/delete-page`

___

## Blog API End Points

### Get All Blog Posts

`GET /api/blog/{slug}`

___

### Get Blog Post By Slug

`GET /api/blog/all-blog-posts`

___

### Add Blog Post

`POST /api/blog/add-blog-post`

___

### Edit Blog Post

`POST /api/blog/edit-blog-post`

___

### Delete Blog Post

`POST /api/blog/delete-blog-post`