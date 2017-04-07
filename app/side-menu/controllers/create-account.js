/* global angular, console, StellarSdk */

angular.module('app')
.controller('CreateAccountCtrl', function ($location, $scope, $translate, Modal, Signer, Submitter, Wallet) {
	'use strict';

	$scope.create			= createAccount;
	$scope.selectAccount	= selectAccount;

	$scope.account		= getAccountName();
	$scope.advanced		= false;
	$scope.minHeight	= getMinHeight();
	$scope.wallet		= Wallet;

	function createAccount() {

		var network = $scope.account.network;

		var accounts = {};
		Object.keys(Wallet.accounts).forEach(function (key) {
			var account = Wallet.accounts[key];
			if (account.network === network) {
				accounts[account.alias] = account;
			}
		});

		var funderName = $scope.account.funder;
		if (funderName in accounts) {

			var newAccount	= StellarSdk.Keypair.random();
			var funder		= accounts[funderName];

			funder.horizon().loadAccount(funder.id)
			.then(function (account) {
				var tx = new StellarSdk.TransactionBuilder(account)
					.addOperation(StellarSdk.Operation.createAccount({
						destination: newAccount.publicKey(),
						startingBalance: $scope.account.amount.toString()
					}))
					.build();

				return {
					tx: tx,
					network: network
				};
			})
			.then(Signer.sign)
			.then(Submitter.submit)
			.then(function () {
				Wallet.importAccount(
					newAccount.publicKey(),
					newAccount.secret(),
					$scope.account.alias,
					network
				);
				$location.path('/');
			});
		}

		else {
			Wallet.createEmptyAccount(
				$scope.account.alias,
				network
			);
			$location.path('/');
		}
	}

	function getAccountName() {
		var numAccounts = Object.keys(Wallet.accounts).length;
		return {
			alias: $translate.instant('account.defaultname', {number: numAccounts + 1}),
			amount: 20
		};
	}

	function getMinHeight() {
		var headerHeight = 40;
		var buttonGroupHeight = 48 + 16 + 8;
		return window.innerHeight - (buttonGroupHeight + headerHeight) + 'px';
	}

	function selectAccount() {
		$scope.account.funder = '';
		Modal.show('app/side-menu/modals/select-account.html', $scope);
	}
})


.directive('validFunder', function (Wallet) {
	'use strict';

	return {
		require: 'ngModel',
		scope: {
			network: '='
		},
		link: function (scope, element, attributes, ngModel) {
			ngModel.$validators.validFunder = function (name) {

				if (!name) {
					return true;
				}

				var network = scope.network;

				var names = {};
				Object.keys(Wallet.accounts).forEach(function (key) {
					if (Wallet.accounts[key].network === network) {
						var accountName = Wallet.accounts[key].alias;
						names[accountName] = 1;
					}
				});

				return (name in names);
			};
		}
	};
})

.controller('SelectFundingAccountCtrl', function ($scope, Wallet) {
	'use strict';

	$scope.cancel = cancel;
	$scope.select = select;

	$scope.accounts = getAccounts();

	function getAccounts() {
		return Object.keys(Wallet.accounts)
		.filter(function (key) {
			var network = $scope.account.network;
			var account = Wallet.accounts[key];
			return (account.network === network);
		})
		.filter(function (key) {
			var account = Wallet.accounts[key];
			return account.canSend(20, 1);
		})
		.map(function (key) {
			return Wallet.accounts[key].alias;
		});
	}

	function cancel() {
		$scope.modal.remove();
	}

	function select(contact) {
		$scope.account.funder = contact;
		$scope.modal.remove();
	}
});

