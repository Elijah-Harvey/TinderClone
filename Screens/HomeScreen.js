import { useNavigation } from "@react-navigation/native";
import { React, useEffect, useLayoutEffect, useRef, useState } from "react";
import tw from "twrnc";
import {
  View,
  Image,
  Text,
  Button,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import useAuth from "../hooks/useAuth";
import { AntDesign, Entypo, Ionicons } from "@expo/vector-icons";
import Swiper from "react-native-deck-swiper";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  getDocs,
  serverTimestamp,
  getDoc,
  where,
} from "@firebase/firestore";
import { db } from "../firebase";
import generateId from "../Lib/generateld";

const DUMMY_DATA = [
  {
    firstName: "Richard",
    lastName: "Harvey",
    job: "Software Engineer",
    photoURL: "https://avatars.githubusercontent.com/u/18176462?v=4",
    age: 36,
    id: 123,
  },
  {
    firstName: "Elizabitch",
    lastName: "Harvey",
    job: "Software Engineer",
    photoURL:
      "https://upload.wikimedia.org/wikipedia/en/9/95/Queen_Elizabitch_album_cover.png",
    age: 16,
    id: 456,
  },
  {
    firstName: "Kassandra",
    lastName: "Harvey",
    job: "Real Estate Agent",
    photoURL:
      "https://ik.imagekit.io/emoxie/2021/12/Jeanna-M.-Harvey-Barnes-MD_RIMI.png",
    age: 36,
    id: 789,
  },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, logOut } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const swipeRef = useRef(null);

  useLayoutEffect(
    () =>
      onSnapshot(doc(db, "users", user.uid), (snapshot) => {
        if (!snapshot.exists()) {
          navigation.navigate("Modal");
        }
      }),
    []
  );

  useEffect(() => {
    let unsub;

    const fetchCards = async () => {
      const passes = await getDocs(
        collection(db, "users", user.uid, "passes")
      ).then((snapshot) => snapshot.docs.map((doc) => doc.id));

      const swipes = await getDocs(
        collection(db, "users", user.uid, "passes")
      ).then((snapshot) => snapshot.docs.map((doc) => doc.id));

      const passedUserIds = passes.length > 0 ? passes : ["test"];
      const swipedUserIds = swipes.length > 0 ? swipes : ["test"];

      unsub = onSnapshot(
        query(
          collection(db, "users"),
          where("id", "not-in", [...passedUserIds, ...swipedUserIds])
        ),
        (snapshot) => {
          setProfiles(
            snapshot.docs
              .filter((doc) => doc.id !== user.uid)
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }))
          );
        }
      );
    };

    fetchCards();
    return unsub;
  }, [db]);

  const swipeLeft = (cardIndex) => {
    if (!profiles[cardIndex]) return;

    const userSwiped = profiles[cardIndex];
    console.log(`You swiped NOPE on ${userSwiped.displayName}`);

    setDoc(doc(db, "users", user.uid, "passes", userSwiped.id), userSwiped);
  };

  const swipeRight = async (cardIndex) => {
    if (!profiles[cardIndex]) return;

    const userSwiped = profiles[cardIndex];
    const loggedInProfile = await (
      await getDoc(doc(db, "users", user.uid))
    ).data();

    //Check if the user swiped on you...
    getDoc(doc(db, "users", userSwiped.id, "swipes", user.uid)).then(
      (documentSnapshot) => {
        if (documentSnapshot.exists()) {
          console.log(`Hooray, You MATCHED with ${userSwiped.displayName}`);

          setDoc(
            doc(db, "users", user.uid, "swipes", userSwiped.id),
            userSwiped
          );

          setDoc(doc(db, "matched", generateId(user.uid, userSwiped.id)), {
            users: {
              [user.uid]: loggedInProfile,
              [userSwiped.id]: userSwiped,
            },
            usersMatched: [user.uid, userSwiped.id],
            timestamp: serverTimestamp(),
          });

          navigation.navigate("Match", {
            loggedInProfile,
            userSwiped,
          });
        } else {
          //User has swiped at first interaction between the two or didnt get swiped on...
          console.log(
            `You swiped on ${userSwiped.display} (${userSwiped.job})`
          );
          setDoc(
            doc(db, "users", user.uid, "swipes", userSwiped.id),
            userSwiped
          );
        }
      }
    );
  };

  return (
    <SafeAreaView style={tw`flex-1`}>
      {/*  Header */}
      <View style={tw` h-30 flex-row items-center justify-between px-5`}>
        <TouchableOpacity onPress={logOut}>
          <Image
            style={tw`h-10 w-10 rounded-full`}
            source={{ uri: user.photoURL }}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Modal")}>
          <Image style={tw`h-14 w-14`} source={require("../logo.png")} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Chat")}>
          <Ionicons name="chatbubbles-sharp" size={30} color="#FF5864" />
        </TouchableOpacity>
      </View>
      {/* End of Header */}

      {/* Cards */}
      <View style={tw`flex-1 -mt-6 `}>
        <Swiper
          ref={swipeRef}
          containerStyle={{ backgroundColor: "transparent" }}
          cards={profiles}
          stackSize={5}
          cardIndex={0}
          animateCardOpacity
          verticalSwipe={false}
          onSwipedLeft={(cardIndex) => {
            console.log("Swipe PASS");
            swipeLeft(cardIndex);
          }}
          onSwipedRight={(cardIndex) => {
            console.log("Swipe MATCH");
            swipeRight(cardIndex);
          }}
          backgroundColor={"#4FD0E9"}
          overlayLabels={{
            left: {
              title: "NOPE",
              style: {
                label: {
                  textAlign: "right",
                  color: "red",
                },
              },
            },
            right: {
              title: "Match",
              style: {
                label: {
                  color: "#4DED30",
                },
              },
            },
          }}
          renderCard={(card) =>
            card ? (
              <View
                key={card.id}
                style={tw`relative bg-white h-3/4 rounded-xl`}
              >
                <Image
                  style={tw`absolute top-0 h-full w-full rounded-xl`}
                  source={{ uri: card.photoURL }}
                />

                <View
                  style={[
                    tw`absolute bottom-0 bg-white w-full flex-row justify-between items-center h-20 px-6 py-2 rounded-b-xl`,
                    styles.cardShadow,
                  ]}
                >
                  <View>
                    <Text style={tw`text-xl font-bold`}>
                      {card.displayName}
                    </Text>
                    <Text>{card.job}</Text>
                  </View>
                  <Text style={tw`text-2xl font-bold`}>{card.age}</Text>
                </View>
              </View>
            ) : (
              <View
                style={[
                  tw`relative bg-white h-3/4 rounded-xl justify-center items-center`,
                  styles.cardShadow,
                ]}
              >
                <Text style={tw`font-bold pb-5`}>No more profiles</Text>

                <Image
                  style={tw`h-20 w-20`}
                  height={100}
                  width={100}
                  source={{ uri: "http://links.papareact.com/6gb" }}
                />
              </View>
            )
          }
        />
      </View>

      <View style={tw`flex flex-row justify-evenly`}>
        <TouchableOpacity
          onPress={() => swipeRef.current.swipeLeft()}
          style={tw`items-center justify-center rounded-full w-16 h-16 bg-red-200`}
        >
          <Entypo name="cross" size={24} color="red" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => swipeRef.current.swipeRight()}
          style={tw`items-center justify-center rounded-full w-16 h-16 bg-green-200`}
        >
          <AntDesign name="heart" size={24} color="green" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,

    elevation: 2,
  },
});
